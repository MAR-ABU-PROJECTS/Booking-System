import axios, { AxiosRequestConfig } from "axios";
import { getSession, updateSession } from "@lib/action";
import { defaultSession } from "@lib/session";

const BASE_URL = "https://booking-system-n26e.onrender.com/api/v1";
// const BASE_URL = "http://localhost:5050";

const axiosInstance = axios.create({
	baseURL: BASE_URL,
});

type FailedRequest = {
	resolve: (value?: string | null) => void;
	reject: (reason?: unknown) => void;
};

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error) reject(error);
		else resolve(token);
	});
	failedQueue = [];
};

const refreshAccessToken = async () => {
	const session = await getSession();
	const refreshToken = session?.user?.refreshToken;

	if (!refreshToken) {
		throw new Error("You need to sign up or login to continue booking");
	}

	const { data } = await axios.post(
		`${BASE_URL}/auth/refresh`,
		{
			refreshToken,
		},
		{ timeout: 10000 }
	);

	const newToken = data?.accessToken;
	if (!newToken) {
		throw new Error("You need to sign up or login to continue booking");
	}

	await updateSession({
		...session,
		token: newToken,
	});

	return newToken;
};

axiosInstance.interceptors.request.use(
	async (config) => {
		const session = await getSession();
		const token = session?.user?.token;

		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						if (originalRequest.headers) {
							originalRequest.headers.Authorization = `Bearer ${token}`;
						}
						return axiosInstance(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const newToken = await refreshAccessToken();

				processQueue(null, newToken);

				if (originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}

				return axiosInstance(originalRequest);
			} catch (err) {
				processQueue(err, null);

				await updateSession({ ...defaultSession.user });
				if (typeof window !== "undefined") {
					setTimeout(() => (window.location.href = "/log-in"), 7000);
				}
				return Promise.reject(err);
			} finally {
				isRefreshing = false;
			}
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
