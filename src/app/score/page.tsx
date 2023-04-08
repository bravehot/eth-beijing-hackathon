"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Tag, message } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import * as echarts from "echarts";
import { Contract, ethers } from "ethers";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { isArray, isEmpty, throttle } from "lodash-es";
import dayjs from "dayjs";
import request from "@/utils/request";

import defaultAvatar from "../../../public/image/eth.png";
import copper from "../../../public/image/copper.png";
import silver from "../../../public/image/silver.png";
import gold from "../../../public/image/gold.png";
import king from "../../../public/image/king.png";

import creditAbi from "@/app/abi/credit.json";
import GradeOracleAbi from "@/app/abi/gradeOracle.json";

const CREDIT_ADDRESS = "0x186CFf323D61b839Aebe897310f3f1310bfAF183";
const ORACLE_ADDRESS = "0xeB462550d220c52A839Ad9D80182Fcc50Bd8C0F6";

/**
 * 缩写 对应
 * OPH 1. 链上支付信用记录 - On-chain payment credit history
 * OCH 2. 链上信贷支付记录 - On-chain credit payment history
 * INFT 3 链上身份 NFT 等级 - On-chain identity NFT level
 * LAC 4 关联账户信用级别 - Linked account credit rating
 * OEC 5 链上电商支付信用记录 - On-chain e-commerce payment credit history
 * SCS 6 Special credit supplement
 * DCS 7. Deshop信用认证分数 - Deshop Credit verification score
 * OAH 8. 链上资产持有金额 - On-chain asset holding amount
 */
const latitudeNameList: string[] = [
  "OPH",
  "OCH",
  "INFT",
  "LAC",
  "OEC",
  "SCS",
  "DCS",
  "OAH",
];

interface InteCompositions {
  name: string;
  max: number;
  grade: number;
}

interface InteUserScore {
  grade: number;
  compositions: InteCompositions[];
}

interface InteUserInfo {
  avatarUrl: StaticImageData | string;
  updateTime: string;
}

const UserBadge: React.FC<{ score: number }> = ({ score }) => {
  const badgeInfo: {
    level: string;
    url: StaticImageData;
  } = useMemo(() => {
    if (score < 320) {
      return {
        level: "青 铜",
        url: copper,
      };
    }
    if (score < 480) {
      return {
        level: "白 银",
        url: silver,
      };
    }
    if (score < 640) {
      return {
        level: "黄 金",
        url: gold,
      };
    }
    return {
      url: king,
      level: "王 者",
    };
  }, [score]);
  return (
    <section className="flex flex-col items-center">
      {score > 0 ? (
        <>
          <motion.div
            className="mt-10"
            animate={{
              scale: [1.1, 1.04, 1.1],
              transition: {
                ease: "linear",
                duration: 2,
                repeat: Infinity,
              },
            }}
          >
            <Image
              className="scale-110"
              src={badgeInfo.url}
              alt="badge"
              width={260}
            />
          </motion.div>
          <p className="text-white text-center w-[210px] mt-6">
            信用等级 : <span className="text-lg">{badgeInfo.level}</span>
          </p>
        </>
      ) : null}
    </section>
  );
};

const Score: React.FC = () => {
  const router = useRouter();
  const address = useSearchParams().get("address");
  const [messageApi, contextHolder] = message.useMessage();

  const chartRef = useRef<echarts.ECharts>();
  const providerRef = useRef<ethers.providers.Web3Provider>();
  const oracleContractRef = useRef<Contract>();

  const [isContractAddress, setIsContractAddress] = useState<boolean>(false);
  const [userScore, setUserScore] = useState<number>(0);
  const [userInfo, setUserInfo] = useState<InteUserInfo>({
    avatarUrl: defaultAvatar,
    updateTime: "",
  });

  const walletAddress = useMemo(() => {
    if (!address) {
      return "";
    }
    return `${address.slice(0, 10)}......${address.slice(-10)}`;
  }, [address]);

  useEffect(() => {
    const chartDOM = document.getElementById("chart");
    if (chartDOM) {
      chartRef.current = echarts.init(chartDOM);
    }
    const handleResize = throttle(() => {
      chartRef.current?.resize();
    }, 300);

    if (isEmpty(window.ethereum)) {
      messageApi.warning("Please install Metamask");
      return;
    }

    providerRef.current = new ethers.providers.Web3Provider(window.ethereum);
    oracleContractRef.current = new Contract(
      ORACLE_ADDRESS,
      GradeOracleAbi,
      providerRef.current.getSigner()
    );

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    requestUserScore();
  }, []);

  const requestUserScore = async () => {
    if (isEmpty(window.ethereum)) {
      messageApi.warning("Please install Metamask");
      return;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const creditContract = new Contract(
      CREDIT_ADDRESS,
      creditAbi,
      provider.getSigner()
    );
    const { data } = await request<InteUserScore>({
      url: "credit/grade",
      method: "GET",
      params: {
        address,
      },
    });

    // determine whether it is a contract address or not
    const code = await providerRef.current?.getCode(address ?? "");
    setIsContractAddress(code !== "0x");

    // get user score by contract
    const tx = await creditContract.getGrade(address);
    console.log("tx: ", tx);
    const {
      _,
      1: latitudeScoreList,
      2: latitudeMaxScoreList,
      lastUpdateTime,
    } = tx;

    if (
      isArray(latitudeScoreList) &&
      isArray(latitudeMaxScoreList) &&
      isArray(tx.realTimeGrade)
    ) {
      const [realTimeMaxScore, realTimeScore] = tx.realTimeGrade;

      const realTime: InteCompositions = {
        name: latitudeNameList[latitudeNameList.length - 1],
        max: ethers.BigNumber.from(realTimeMaxScore).toNumber(),
        grade: ethers.BigNumber.from(realTimeScore).toNumber(),
      };

      const sum = latitudeScoreList
        .reduce(
          (acc, cur) => acc.add(ethers.BigNumber.from(cur)),
          ethers.BigNumber.from(0)
        )
        .add(ethers.BigNumber.from(realTimeScore));

      const underChainScore: InteUserScore = {
        grade: data.grade,
        compositions: data.compositions.map(({ max, grade }, index) => {
          return {
            name: latitudeNameList[index],
            max,
            grade,
          };
        }),
      };

      const upChainScore: InteUserScore = {
        grade: sum.toNumber(),
        compositions: latitudeScoreList.map((item, index) => {
          return {
            name: latitudeNameList[index],
            max: latitudeMaxScoreList[index].toNumber(),
            grade: item.toNumber(),
          };
        }),
      };

      underChainScore.compositions.push(realTime);
      console.log("underChainScore: ", underChainScore);
      upChainScore.compositions.push(realTime);
      console.log("upChainScore: ", upChainScore);

      console.log("lastUpdateTime.toNumber(): ", lastUpdateTime.toNumber());

      setUserScore(sum.toNumber());
      setUserInfo({
        ...userInfo,
        updateTime:
          lastUpdateTime.toNumber() === 0
            ? ""
            : dayjs
                .unix(lastUpdateTime.toNumber())
                .format("YYYY-MM-DD HH:mm:ss"),
      });
      handleChartOption(underChainScore, upChainScore);
    }
  };

  const handleChartOption = (
    { compositions: currentCompositions }: InteUserScore,
    { compositions: previousCompositions }: InteUserScore
  ) => {
    chartRef.current?.setOption({
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0,0,0,0.7)",
        color: "black",
        textStyle: {
          color: "white", //设置文字颜色
        },
      },
      radar: [
        {
          indicator: currentCompositions.map(({ name, max }) => {
            return {
              name,
              max,
            };
          }),
          center: ["50%", "50%"],
          splitLine: {
            show: true,
            lineStyle: {
              width: 1,
              color: "white", // 图表背景网格线的颜色
            },
          },
        },
      ],
      series: [
        {
          type: "radar",
          tooltip: {
            trigger: "item",
          },
          itemStyle: { color: "#d946ef" },
          areaStyle: {
            color: "#9974ee",
            borderColor: "#9974ee",
          },
          data: [
            {
              value: previousCompositions.map(({ grade }) => grade),
              name: "上次分值",
            },
          ],
        },
        {
          type: "radar",
          tooltip: {
            trigger: "item",
          },
          itemStyle: { color: "#9974ee" },
          areaStyle: {
            color: "#d946ef",
            borderColor: "#d946ef",
          },
          data: [
            {
              value: currentCompositions.map(({ grade }) => grade),
              name: "各项分值",
            },
          ],
        },
      ],
    });
  };

  const handleDataChain = async () => {
    messageApi.loading({
      content: "上链中, 请稍后",
      duration: 3000,
    });

    try {
      const tx = await oracleContractRef.current?.requestUserGrades(address);
      tx.wait();
      messageApi.destroy();
      messageApi.success("上链成功", 1);
      messageApi.loading({
        content: "正在获取最新上链数据",
      });

      setTimeout(() => {
        messageApi.destroy();
        requestUserScore();
        messageApi.success("数据更新成功");
      }, 3000);
    } catch (error) {
      messageApi.destroy();
      messageApi.error("上链失败");
    }
  };

  const handleBack = () => {
    router.push("/home");
  };

  return (
    <>
      {contextHolder}
      <section className="relative z-10 h-full">
        <section className="w-2/3 mx-auto h-full flex flex-col pt-5 mb-10">
          <section className="flex justify-start mb-10">
            <Button
              className="flex items-center justify-center"
              type="text"
              icon={<LeftOutlined />}
              onClick={handleBack}
            />
          </section>

          <section className="w-full h-full grid grid-cols-2 grid-">
            <section>
              <section className="flex">
                <Image
                  src={userInfo.avatarUrl}
                  alt="default avatar"
                  width={50}
                  height={50}
                  className="mr-4"
                />
                <section className="flex flex-col justify-between items-start">
                  <span className="text-white">{walletAddress}</span>
                  {isContractAddress ? (
                    <Tag color="purple">Contract</Tag>
                  ) : (
                    <Tag color="magenta">EVM Wallet</Tag>
                  )}
                </section>
              </section>
              <UserBadge score={userScore} />
            </section>

            <section className="flex flex-col">
              <section className="w-full flex justify-start text-white items-center">
                <span className="text-2xl mr-4">您的信用分为:</span>
                <CountUp className="text-3xl" end={userScore} />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={handleDataChain}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 w-[120px] h-[34px] rounded-xl shadow-inner text-white text-sm ml-auto"
                >
                  信用分上链
                </motion.button>
              </section>
              <section id="chart" className="w-full h-[460px]"></section>
              <section className="text-white w-full text-center">
                {userInfo.updateTime ? (
                  <span className="text-sm">
                    上次更新时间: {userInfo.updateTime}
                  </span>
                ) : null}
              </section>
            </section>
          </section>
        </section>
      </section>
    </>
  );
};

export default Score;
