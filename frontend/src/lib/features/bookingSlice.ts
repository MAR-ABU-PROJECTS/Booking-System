"use client";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type BookingSliceType = {
	id:string;
	location: string;
	name: string;
	checkIn: undefined | Date;
	checkOut: undefined | Date;
	adults: number;
	children: number;
	infants: number;
	price: number;
};
const initialState: BookingSliceType = {
	id:'',
	location: "",
	name:"",
	checkIn: undefined,
	checkOut: undefined,
	adults: 1,
	children: 0,
	infants: 0,
	price:0
};

type BookingField = keyof BookingSliceType;

export const bookingSlice = createSlice({
	name: "booking",
	initialState,
	reducers: {
    updateBooking: <K extends BookingField>(
			state: BookingSliceType,
			action: PayloadAction<{ key: K; value: BookingSliceType[K] }>
		) => {
			state[action.payload.key] = action.payload.value;
		},
		resetBooking: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {updateBooking, resetBooking} = bookingSlice.actions;

export default bookingSlice.reducer;
