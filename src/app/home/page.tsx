"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { motion } from "framer-motion";
import { ethers } from "ethers";

import request from "@/utils/request";

export default function Home() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [walletProvider, setWalletProvider] = useState<any>(null);
  const [walletInputAddress, setWalletInputAddress] = useState<string>("");

  useEffect(() => {
    inputRef.current?.focus();

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setWalletProvider(provider);
      provider
        .getSigner()
        .getAddress()
        .then((address: string) => {
          console.log("address: ", address);
          setWalletInputAddress(address);
        });
    } else {
      messageApi.open({
        type: "warning",
        content: "Please install MetaMask",
      });
    }
  }, []);

  const handleConnect = async () => {
    if (window.ethereum) {
      if (walletInputAddress) {
        setWalletInputAddress("");
      } else {
        const [account]: string[] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletInputAddress(account);
      }
    } else {
      messageApi.open({
        type: "warning",
        content: "Please install MetaMask",
      });
    }
  };

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

      await request({
        url: "/credit/sync",
        method: "GET",
        params: {
          address: account,
        },
      });

      const timer = setInterval(async () => {
        const res = await request({
          url: "/credit/sync/state",
          method: "GET",
          params: {
            address: account,
          },
        });
        if (res.data === "READY") {
          clearInterval(timer);
          router.push(`/score?address=${account}`);
        }
      }, 3000);
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
          <section className="flex self-end">
            <motion.button
              onClick={handleConnect}
              className="bg-gradient-to-r tracking-wider text-sm from-violet-500 to-fuchsia-500 w-[150px] h-[45px] rounded-xl mt-10 shadow-inner"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {walletInputAddress ? "Disconnect" : "Connect Wallet"}
            </motion.button>
          </section>
          <h1 className="text-3xl font-bold text-center mb-20 mt-40">
            查看您在 web3 世界的信用分数
          </h1>
          <input
            ref={inputRef}
            value={walletInputAddress}
            className="h-[50px] inline-block focus:outline-none placeholder-white py-3 px-3 bg-transparent rounded-xl border-fuchsia-300 border-2 transition-[border-color]  w-2/3 mt-10 mb-5 mx-auto"
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
