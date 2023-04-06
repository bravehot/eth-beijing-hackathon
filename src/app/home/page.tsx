"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { isEmpty } from "lodash-es";

import request from "@/utils/request";

import creditAbi from "@/app/abi/credit.json";

const CREDIT_ADDRESS = "0xBFE4132976C6Bd03E36eC9c47d353D056Bf8D76A";

export default function Home() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [walletProvider, setWalletProvider] = useState<any>(null);
  const [walletInputAddress, setWalletInputAddress] = useState<string>("");

  useEffect(() => {
    inputRef.current?.focus();

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setWalletProvider(provider);
  }, []);

  const handleSorce = async () => {
    const [account]: string[] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (account) {
      setWalletInputAddress(account);

      messageApi.open({
        type: "loading",
        content: "正在计算中，请稍后...",
        duration: 3000,
      });

      router.push("/score?address=" + account);

      //   await request({
      //     url: "/credit/sync",
      //     method: "GET",
      //     params: {
      //       address: account,
      //     },
      //   });

      //   const timer = setInterval(async () => {
      //     const res = await request({
      //       url: "/credit/sync/state",
      //       method: "GET",
      //       params: {
      //         address: account,
      //       },
      //     });
      //     if (res.data === "READY") {
      //       const { data } = await request<InteUserScore>({
      //         url: "credit/grade",
      //         method: "GET",
      //         params: {
      //           address: account,
      //         },
      //       });

      //       if (!isEmpty(data)) {
      //         clearInterval(timer);
      //       }

      //       //   const creditContract = new Contract(
      //       //     CREDIT_ADDRESS,
      //       //     creditAbi,
      //       //     walletProvider.getSigner()
      //       //   );

      //       //   console.log("creditContract: ", creditContract);
      //       //   console.log("walletInputAddress: ", walletInputAddress);
      //       // const tx = await creditContract.getGrade(walletInputAddress);
      //       // await tx.wait();
      //       // console.log("等待上链");
      //       // console.log(tx);

      //     //   messageApi.destroy();
      //     //   messageApi.open({
      //     //     type: "success",
      //     //     content: "计算成功",
      //     //   });

      //       router.push("/score");
      //     }
      //   }, 3000);
    } else {
      messageApi.open({
        type: "warning",
        content: "请先连接钱包",
      });
    }
  };

  return (
    <>
      {contextHolder}
      <section className="relative text-white z-10 w-full h-full">
        <section className="w-2/3 mx-auto flex items-center my-auto flex-col h-full">
          <h1 className="text-3xl font-bold text-center mb-20 mt-36">
            查看您在 web3 世界的信用分数
          </h1>
          <input
            ref={inputRef}
            value={walletInputAddress}
            className="h-[50px] inline-block focus:outline-none placeholder-white py-3 px-3 bg-transparent rounded-xl border-fuchsia-300 border-2 transition-[border-color]  w-2/3 mx-auto"
            placeholder="钱包地址"
            disabled
          />

          <motion.button
            onClick={handleSorce}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 w-[180px] h-[48px] rounded-xl mt-10 shadow-inner"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            计 算
          </motion.button>
        </section>
      </section>
    </>
  );
}
