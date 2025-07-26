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
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA neon_auth;


ALTER SCHEMA neon_auth OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: neondb_owner
--

CREATE TABLE neon_auth.users_sync (
    raw_json jsonb NOT NULL,
    id text GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED NOT NULL,
    name text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE neon_auth.users_sync OWNER TO neondb_owner;

--
-- Name: plate_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.plate_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    plate_type integer NOT NULL,
    template_wells jsonb DEFAULT '{}'::jsonb,
    dosing_parameters jsonb DEFAULT '{}'::jsonb,
    control_configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    last_modified timestamp without time zone DEFAULT now(),
    use_count integer DEFAULT 0
);


ALTER TABLE public.plate_templates OWNER TO neondb_owner;

--
-- Name: plates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.plates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    name character varying(255) NOT NULL,
    plate_type integer NOT NULL,
    description text,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    last_modified timestamp without time zone DEFAULT now(),
    tags jsonb DEFAULT '[]'::jsonb,
    status character varying(50) DEFAULT 'draft'::character varying,
    wells jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.plates OWNER TO neondb_owner;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    last_modified timestamp without time zone DEFAULT now(),
    created_by character varying(255) DEFAULT 'migrated_user'::character varying NOT NULL
);


ALTER TABLE public.projects OWNER TO neondb_owner;

--
-- Name: user_cell_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_cell_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    cell_type_name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    last_used timestamp without time zone DEFAULT now(),
    use_count integer DEFAULT 1
);


ALTER TABLE public.user_cell_types OWNER TO neondb_owner;

--
-- Name: user_compounds; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_compounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    compound_name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    last_used timestamp without time zone DEFAULT now(),
    use_count integer DEFAULT 1
);


ALTER TABLE public.user_compounds OWNER TO neondb_owner;

--
-- Data for Name: users_sync; Type: TABLE DATA; Schema: neon_auth; Owner: neondb_owner
--

COPY neon_auth.users_sync (raw_json, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: plate_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.plate_templates (id, user_id, name, description, plate_type, template_wells, dosing_parameters, control_configuration, created_at, last_modified, use_count) FROM stdin;
5eb4e64d-fa1a-4bdb-bb4a-17a6753baa45	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	Testing		96	{"A1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "A2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "B1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "B2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "C1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "C2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "D1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "D2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "E1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "E2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "F1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "F2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "G1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "G2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "H1": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}, "H2": {"cellType": "", "compound": "DMSO", "concentration": "", "concentrationUnits": ""}}	{"replicates": 3, "concentrations": [10, 1, 0.1, 0.01], "dilution_factor": 10, "concentration_units": "μM"}	{"blank_wells": [], "negative_controls": [], "positive_controls": []}	2025-07-26 04:11:16.898166	2025-07-26 07:26:02.940698	2
\.


--
-- Data for Name: plates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.plates (id, project_id, name, plate_type, description, created_by, created_at, last_modified, tags, status, wells) FROM stdin;
ca6d17d9-1ec0-4d62-93b2-6d52e03ca501	550e8400-e29b-41d4-a716-446655440002	ff (Copy)	96	ff	Current User	2025-07-24 05:18:40.14772	2025-07-24 05:31:07.327892	["ff"]	completed	{"B2": {"cellType": "", "compound": "money", "concentration": "", "concentrationUnits": ""}, "B4": {"cellType": "", "compound": "KKK", "concentration": "", "concentrationUnits": ""}, "C6": {"cellType": "", "compound": "Money", "concentration": "", "concentrationUnits": ""}}
74b1204f-11b0-41d4-82e7-9f1961a086fe	550e8400-e29b-41d4-a716-446655440002	ff	96	ff	Current User	2025-07-24 04:05:36.426848	2025-07-24 05:12:46.010097	["ff"]	draft	{"B4": {"cellType": "", "compound": "KKK", "concentration": "", "concentrationUnits": ""}, "C6": {"cellType": "", "compound": "Money", "concentration": "", "concentrationUnits": ""}}
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.projects (id, name, description, created_at, last_modified, created_by) FROM stdin;
550e8400-e29b-41d4-a716-446655440002	Toxicity Testing	Evaluating compound toxicity profiles	2024-02-01 00:00:00	2024-02-10 00:00:00	migrated_user
\.


--
-- Data for Name: user_cell_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_cell_types (id, user_id, cell_type_name, description, created_at, last_used, use_count) FROM stdin;
\.


--
-- Data for Name: user_compounds; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_compounds (id, user_id, compound_name, description, created_at, last_used, use_count) FROM stdin;
cb8b3239-30ae-4c86-91e3-3859b29ce4cf	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	MM	\N	2025-07-25 22:22:46.145858	2025-07-25 22:22:46.145858	1
7ccb2620-4dc4-41be-a204-d2763bd77f7c	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	Drug	\N	2025-07-26 00:03:38.96166	2025-07-26 00:03:38.96166	1
7be62e4b-a55a-4a2a-aba6-ddd9815b93ba	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	DMSO	\N	2025-07-26 00:04:28.856608	2025-07-26 00:04:28.856608	1
3112f7b5-980d-499f-9133-39d8edcf9878	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	POSCON	\N	2025-07-26 00:05:51.612217	2025-07-26 00:05:51.612217	1
32eb4f8e-79fc-4023-822e-910ab6f49dea	user_2zsXt5vWHe5ijPxhqODAEgS7LHV	D	\N	2025-07-26 07:25:55.030752	2025-07-26 07:25:55.030752	1
\.


--
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: neondb_owner
--

ALTER TABLE ONLY neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- Name: plate_templates plate_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plate_templates
    ADD CONSTRAINT plate_templates_pkey PRIMARY KEY (id);


--
-- Name: plates plates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plates
    ADD CONSTRAINT plates_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: user_cell_types user_cell_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_cell_types
    ADD CONSTRAINT user_cell_types_pkey PRIMARY KEY (id);


--
-- Name: user_cell_types user_cell_types_user_id_cell_type_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_cell_types
    ADD CONSTRAINT user_cell_types_user_id_cell_type_name_key UNIQUE (user_id, cell_type_name);


--
-- Name: user_compounds user_compounds_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_compounds
    ADD CONSTRAINT user_compounds_pkey PRIMARY KEY (id);


--
-- Name: user_compounds user_compounds_user_id_compound_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_compounds
    ADD CONSTRAINT user_compounds_user_id_compound_name_key UNIQUE (user_id, compound_name);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: neondb_owner
--

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);


--
-- Name: idx_plate_templates_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plate_templates_created_at ON public.plate_templates USING btree (created_at DESC);


--
-- Name: idx_plate_templates_use_count; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plate_templates_use_count ON public.plate_templates USING btree (use_count DESC);


--
-- Name: idx_plate_templates_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plate_templates_user_id ON public.plate_templates USING btree (user_id);


--
-- Name: idx_plates_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plates_created_at ON public.plates USING btree (created_at);


--
-- Name: idx_plates_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plates_created_by ON public.plates USING btree (created_by);


--
-- Name: idx_plates_project_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plates_project_id ON public.plates USING btree (project_id);


--
-- Name: idx_plates_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_plates_status ON public.plates USING btree (status);


--
-- Name: idx_projects_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_projects_created_at ON public.projects USING btree (created_at);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_user_cell_types_last_used; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_cell_types_last_used ON public.user_cell_types USING btree (last_used DESC);


--
-- Name: idx_user_cell_types_use_count; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_cell_types_use_count ON public.user_cell_types USING btree (use_count DESC);


--
-- Name: idx_user_cell_types_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_cell_types_user_id ON public.user_cell_types USING btree (user_id);


--
-- Name: idx_user_compounds_last_used; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_compounds_last_used ON public.user_compounds USING btree (last_used DESC);


--
-- Name: idx_user_compounds_use_count; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_compounds_use_count ON public.user_compounds USING btree (use_count DESC);


--
-- Name: idx_user_compounds_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_compounds_user_id ON public.user_compounds USING btree (user_id);


--
-- Name: plates plates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plates
    ADD CONSTRAINT plates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

