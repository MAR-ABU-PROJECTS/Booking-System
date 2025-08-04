import axios, { AxiosRequestConfig } from "axios";
import { getSession } from "../lib/action";

export const BASE_URL = "/";

const axiosInstance = axios.create({
	baseURL: BASE_URL,
	withCredentials: true,
});

axiosInstance.interceptors.request.use(
	async (config) => {
		const session = await getSession();
		const token = session?.user?.token;

		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			error.message = "Unauthorized: Please log in.";
			return Promise.reject(error);
		}
		return Promise.reject(error);
	}
);

export const apiService = {
	get: async (endpoint: string, config?: AxiosRequestConfig) => {
		const response = await axiosInstance.get(endpoint, config);
		return response.data;
	},

	post: async (
		endpoint: string,
		data: unknown,
		config?: AxiosRequestConfig
	) => {
		const response = await axiosInstance.post(endpoint, data, config);
		return response.data;
	},

	put: async (
		endpoint: string,
		data: unknown,
		config?: AxiosRequestConfig
	) => {
		const response = await axiosInstance.put(endpoint, data, config);
		return response.data;
	},

	patch: async (
		endpoint: string,
		data: unknown,
		config?: AxiosRequestConfig
	) => {
		const response = await axiosInstance.patch(endpoint, data, config);
		return response.data;
	},

	delete: async (endpoint: string, config?: AxiosRequestConfig) => {
		const response = await axiosInstance.delete(endpoint, config);
		return response.data;
	},
};
