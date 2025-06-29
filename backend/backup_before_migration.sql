--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'APPROVE',
    'REJECT',
    'VERIFY',
    'CANCEL'
);


ALTER TYPE public."AuditAction" OWNER TO postgres;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'CONFIRMED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'CANCELLED',
    'REFUNDED',
    'COMPLETED'
);


ALTER TYPE public."BookingStatus" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'BOOKING_CONFIRMATION',
    'PAYMENT_RECEIVED',
    'RECEIPT_VERIFIED',
    'BOOKING_APPROVED',
    'BOOKING_CANCELLED',
    'REVIEW_REQUEST',
    'SYSTEM_UPDATE'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIALLY_PAID',
    'REFUNDED',
    'FAILED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: PropertyStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PropertyStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'MAINTENANCE',
    'COMING_SOON',
    'SUSPENDED'
);


ALTER TYPE public."PropertyStatus" OWNER TO postgres;

--
-- Name: PropertyType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PropertyType" AS ENUM (
    'APARTMENT',
    'PENTHOUSE',
    'VILLA',
    'SUITE',
    'MANSION',
    'HOUSE'
);


ALTER TYPE public."PropertyType" OWNER TO postgres;

--
-- Name: ReceiptStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReceiptStatus" AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'UNDER_REVIEW'
);


ALTER TYPE public."ReceiptStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'CUSTOMER',
    'PROPERTY_HOST',
    'ADMIN',
    'SUPER_ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING_VERIFICATION'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

