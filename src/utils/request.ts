import axios from "axios";
import { message } from "antd";

import type { AxiosRequestConfig, AxiosResponse } from "axios";

const netWorkCodeMaps: Record<number, string> = {
  404: "404 Not Found",
  405: "Method Not Allowed",
  504: "网关错误",
  500: "服务器错误",
} as const;

const axiosInterface = axios.create({
  baseURL: "https://101.36.120.180",
  timeout: 10000,
  headers: {
    "content-type": "application/json",
  },
});

// 请求拦截
axiosInterface.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    const { headers } = config;
    headers!.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截
axiosInterface.interceptors.response.use(
  async (response: AxiosResponse<API.BaseResponseType<any>>) => {
    const { status, data } = response;
    if (status === 200) {
      const { code, message } = data;
      const responseCode = Number(code);
      console.log("responseCode: ", responseCode);
    }
    return response;
  },
  ({ response }) => {
    // 请求失败，也弹出状态码
    message.error(netWorkCodeMaps[response.status] || "服务器错误");
  }
);

// 对外暴露 request 请求函数
const request = async <T>(
  config: AxiosRequestConfig
): Promise<API.BaseResponseType<T>> => {
  try {
    const { data } = await axiosInterface(config);
    return data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export default request;
