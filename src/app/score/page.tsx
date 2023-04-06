"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { Button, Tag } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import * as echarts from "echarts";
import { Contract, ethers } from "ethers";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { throttle } from "lodash-es";

import request from "@/utils/request";

import defaultAvatar from "../../../public/image/eth.png";
import copper from "../../../public/image/copper.png";
import silver from "../../../public/image/silver.png";
import gold from "../../../public/image/gold.png";
import king from "../../../public/image/king.png";

import GradeOracleAbi from "@/app/abi/gradeOracle.json";
import { useRouter, useSearchParams } from "next/navigation";

const ORACLE_ADDRESS = "0x8849e164E749D47d370e93a1D0eE65972caa334F";

interface InteUserScore {
  grade: number;
  compositions: {
    name: string;
    max: number;
    grade: number;
  }[];
}

interface InteUserInfo {
  avatarUrl: StaticImageData | string;
}

interface InterUserBadge {
  score: number;
}
const UserBadge: React.FC<InterUserBadge> = ({ score }) => {
  const badgeInfo: {
    level: string;
    url: StaticImageData;
  } = useMemo(() => {
    if (score < 100) {
      return {
        level: "青 铜",
        url: copper,
      };
    }
    if (score < 500) {
      return {
        level: "白 银",
        url: silver,
      };
    }
    if (score < 1000) {
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
    <>
      <section className="flex flex-col items-center">
        <motion.div
          className="mt-10"
          whileHover={{ scale: 1.1 }}
          animate={{
            scale: [1.1, 1],
            transition: {
              duration: 1,
              once: true,
            },
          }}
        >
          <Image
            className="scale-110"
            src={badgeInfo.url}
            alt="badge"
            width={210}
          />
        </motion.div>
        <span className="text-white text-center w-[210px] mt-4">
          信用等级 : {badgeInfo.level}
        </span>
      </section>
      <section className="text-white">
        <p>提升您的信用等级</p>
      </section>
    </>
  );
};

const Score: React.FC = () => {
  const router = useRouter();
  const address = useSearchParams().get("address");

  const chartRef = useRef<echarts.ECharts>();
  const providerRef = useRef<ethers.providers.Web3Provider>();
  const oracleContractRef = useRef<Contract>();

  const [isContractAddress, setIsContractAddress] = useState<boolean>(false);
  const [userScore, setUserScore] = useState<InteUserScore>({
    grade: 0,
    compositions: [],
  });
  const [userInfo, setUserInfo] = useState<InteUserInfo>({
    avatarUrl: defaultAvatar,
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
    const requestUserScore = async () => {
      // const { data } = await request<InteUserScore>({
      //   url: "credit/grade",
      //   method: "GET",
      //   params: {
      //     address,
      //   },
      // });
      const data = {
        grade: 299,
        compositions: [
          {
            name: "a",
            max: 100,
            grade: 47,
          },
          {
            name: "b",
            max: 100,
            grade: 38,
          },
          {
            name: "c",
            max: 100,
            grade: 50,
          },
          {
            name: "d",
            max: 100,
            grade: 22,
          },
          {
            name: "e",
            max: 100,
            grade: 68,
          },
          {
            name: "f",
            max: 100,
            grade: 6,
          },
          {
            name: "g",
            max: 100,
            grade: 68,
          },
        ],
      };
      setUserScore(data);
      handleChartOption(data);
    };

    const checkWalletAddress = async () => {
      const code = await providerRef.current?.getCode(address ?? "");
      setIsContractAddress(code !== "0x");
    };

    checkWalletAddress();
    requestUserScore();
  }, [address]);

  const handleChartOption = ({ compositions }: InteUserScore) => {
    if (compositions.length) {
      console.log(chartRef.current);
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
            indicator: compositions.map(({ name, max }) => {
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
            itemStyle: {
              color: "#9974ee",
            },
            areaStyle: {
              color: "#d946ef",
              borderColor: "#d946ef",
            },
            data: [
              {
                value: compositions.map(({ grade }) => grade),
                name: "各项分值",
              },
            ],
          },
        ],
      });
    }
  };

  const handleDataChain = async () => {
    console.log(
      "walletProvider.getSigner(): ",
      providerRef.current?.getSigner()
    );
    console.log("gradeContract: ", oracleContractRef.current);

    const tx = await oracleContractRef.current?.requestUserGrades(address);
    tx.wait();
    console.log("等待上链");
    console.log("tx: ", tx);
  };

  const handleBack = () => {
    router.push("/home");
  };

  return (
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
            <UserBadge score={userScore.grade} />
          </section>

          <section className="flex flex-col">
            <section className="w-full flex justify-start text-white items-center">
              <span className="text-2xl mr-4">您的信用分为:</span>
              <CountUp className="text-3xl" end={userScore?.grade} />

              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={handleDataChain}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 w-[120px] h-[34px] rounded-xl shadow-inner text-white text-sm ml-auto"
              >
                信用分上链
              </motion.button>
            </section>
            <section id="chart" className="w-full h-[480px]"></section>
          </section>
        </section>
      </section>
    </section>
  );
};

export default Score;
