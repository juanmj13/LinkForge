--
-- PostgreSQL database dump
--

\restrict qbv7JZYaUMKdAUDADLkwESt9aQR0wfApWv1EZAbT8bBA0RiCoN1Omodl7PKFeGr

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-09-14 01:30:50

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
-- TOC entry 4929 (class 1262 OID 16388)
-- Name: LinkForge; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE "LinkForge" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


ALTER DATABASE "LinkForge" OWNER TO postgres;

\unrestrict qbv7JZYaUMKdAUDADLkwESt9aQR0wfApWv1EZAbT8bBA0RiCoN1Omodl7PKFeGr
\connect "LinkForge"
\restrict qbv7JZYaUMKdAUDADLkwESt9aQR0wfApWv1EZAbT8bBA0RiCoN1Omodl7PKFeGr

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
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4930 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 225 (class 1255 OID 16399)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16438)
-- Name: datapoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.datapoints (
    id bigint NOT NULL,
    event_id bigint NOT NULL,
    name text NOT NULL,
    value double precision NOT NULL,
    units text NOT NULL,
    port integer NOT NULL,
    type text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.datapoints OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16437)
-- Name: datapoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.datapoints ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.datapoints_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 16429)
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    client_id bigint NOT NULL,
    location text NOT NULL,
    area text NOT NULL,
    subarea text NOT NULL,
    device_id text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    version text NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    device_category text NOT NULL,
    device_name text NOT NULL
);


ALTER TABLE public.events OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16428)
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 218 (class 1259 OID 16390)
-- Name: system_datapoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_datapoints (
    id bigint NOT NULL,
    name text NOT NULL,
    default_units text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_datapoints OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16389)
-- Name: system_datapoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.system_datapoints ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.system_datapoints_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 16415)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    master_user_name text NOT NULL,
    password_hash text NOT NULL,
    license_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16414)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4775 (class 2606 OID 16445)
-- Name: datapoints datapoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datapoints
    ADD CONSTRAINT datapoints_pkey PRIMARY KEY (id);


--
-- TOC entry 4773 (class 2606 OID 16436)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- TOC entry 4765 (class 2606 OID 16398)
-- Name: system_datapoints system_datapoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_datapoints
    ADD CONSTRAINT system_datapoints_pkey PRIMARY KEY (id);


--
-- TOC entry 4769 (class 2606 OID 16425)
-- Name: users users_master_user_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_master_user_name_key UNIQUE (master_user_name);


--
-- TOC entry 4771 (class 2606 OID 16423)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4766 (class 1259 OID 16401)
-- Name: uniq_system_datapoints_name_units; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_system_datapoints_name_units ON public.system_datapoints USING btree (name, default_units);


--
-- TOC entry 4767 (class 1259 OID 16427)
-- Name: uniq_users_master_user_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_users_master_user_name ON public.users USING btree (master_user_name);


--
-- TOC entry 4777 (class 2620 OID 16400)
-- Name: system_datapoints set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.system_datapoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4778 (class 2620 OID 16426)
-- Name: users set_updated_at_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4776 (class 2606 OID 16446)
-- Name: datapoints datapoints_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.datapoints
    ADD CONSTRAINT datapoints_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


-- Completed on 2025-09-14 01:30:50

--
-- PostgreSQL database dump complete
--

\unrestrict qbv7JZYaUMKdAUDADLkwESt9aQR0wfApWv1EZAbT8bBA0RiCoN1Omodl7PKFeGr

