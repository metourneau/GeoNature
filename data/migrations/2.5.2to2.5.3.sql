-- Ajout champs "Statut biogéographique" dans la Synthèse
INSERT INTO gn_synthese.defaults_nomenclatures_value (mnemonique_type, id_organism, regne, group2_inpn, id_nomenclature) VALUES
('STAT_BIOGEO',0,0,0, ref_nomenclatures.get_id_nomenclature('STAT_BIOGEO', '1'))
;

ALTER TABLE gn_synthese.synthese 
ADD COLUMN id_nomenclature_biogeo_status integer DEFAULT gn_synthese.get_default_nomenclature_value('STAT_BIOGEO');

ALTER TABLE ONLY gn_synthese.synthese
    ADD CONSTRAINT fk_synthese_id_nomenclature_biogeo_status 
    FOREIGN KEY (id_nomenclature_biogeo_status) 
    REFERENCES ref_nomenclatures.t_nomenclatures(id_nomenclature) ON UPDATE CASCADE;

ALTER TABLE gn_synthese.synthese
  ADD CONSTRAINT check_synthese_biogeo_status CHECK (ref_nomenclatures.check_nomenclature_type_by_mnemonique(id_nomenclature_biogeo_status,'STAT_BIOGEO')) NOT VALID;

-- Ajout de la nomenclature "Statut biogéographique" dans la vue décodant les nomenclatures
DROP VIEW gn_synthese.v_synthese_decode_nomenclatures;
CREATE OR REPLACE VIEW gn_synthese.v_synthese_decode_nomenclatures AS
SELECT
s.id_synthese,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_geo_object_nature) AS nat_obj_geo,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_grp_typ) AS grp_typ,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_obs_technique) AS obs_technique,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_bio_status) AS bio_status,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_bio_condition) AS bio_condition,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_naturalness) AS naturalness,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_exist_proof) AS exist_proof ,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_valid_status) AS valid_status,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_diffusion_level) AS diffusion_level,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_life_stage) AS life_stage,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_sex) AS sex,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_obj_count) AS obj_count,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_type_count) AS type_count,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_sensitivity) AS sensitivity,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_observation_status) AS observation_status,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_blurring) AS blurring,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_source_status) AS source_status,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_info_geo_type) AS info_geo_type,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_determination_method) AS determination_method,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_behaviour) AS occ_behaviour,
ref_nomenclatures.get_nomenclature_label(s.id_nomenclature_biogeo_status) AS occ_stat_biogeo
FROM gn_synthese.synthese s;

-- Refonte de la vue listant les observations pour l'export de la Synthèse
DROP VIEW gn_synthese.v_synthese_for_export;
CREATE OR REPLACE VIEW gn_synthese.v_synthese_for_export AS
 SELECT 
    s.date_min::date AS date_debut,
    s.date_max::date AS date_fin,
    s.date_min::time AS heure_debut,
    s.date_max::time AS heure_fin,
    t.cd_nom AS cd_nom,
    t.cd_ref AS cd_ref,
    t.nom_valide AS nom_valide,
    t.nom_vern as nom_vernaculaire,
    s.nom_cite AS nom_cite,
    t.regne AS regne,
    t.group1_inpn AS group1_inpn,
    t.group2_inpn AS group2_inpn,
    t.classe AS classe,
    t.ordre AS ordre,
    t.famille AS famille,
    t.id_rang AS rang_taxo,
    s.count_min AS nombre_min,
    s.count_max AS nombre_max,
    s.altitude_min AS alti_min,
    s.altitude_max AS alti_max,
    s.depth_min AS prof_min,
    s.depth_max AS prof_max,
    s.observers AS observateurs,
    s.id_digitiser AS id_digitiser, -- Utile pour le CRUVED
    s.determiner AS determinateur,
    communes AS communes,
    public.ST_astext(s.the_geom_4326) AS geometrie_wkt_4326,
    public.ST_x(s.the_geom_point) AS x_centroid_4326,
    public.ST_y(s.the_geom_point) AS y_centroid_4326,
    public.ST_asgeojson(s.the_geom_4326) AS geojson_4326,-- Utile pour la génération de l'export en SHP
    public.ST_asgeojson(s.the_geom_local) AS geojson_local,-- Utile pour la génération de l'export en SHP
    s.place_name AS nom_lieu,
    s.comment_context AS comment_releve,
    s.comment_description AS comment_occurrence,
    s.validator AS validateur,
    n21.label_default AS niveau_validation,
    s.meta_validation_date as date_validation,
    s.validation_comment AS comment_validation,
    s.digital_proof AS preuve_numerique_url,
    s.non_digital_proof AS preuve_non_numerique,
    d.dataset_name AS jdd_nom,
    d.unique_dataset_id AS jdd_uuid,
    d.id_dataset AS jdd_id, -- Utile pour le CRUVED
    af.acquisition_framework_name AS ca_nom,
    af.unique_acquisition_framework_id AS ca_uuid,
    d.id_acquisition_framework AS ca_id,
    s.cd_hab AS cd_habref,
    hab.lb_code AS cd_habitat,
    hab.lb_hab_fr AS nom_habitat,
    s.precision as precision_geographique,
    n1.label_default AS nature_objet_geo,
    n2.label_default AS type_regroupement,
    s.grp_method AS methode_regroupement,
    n3.label_default AS technique_observation,
    n5.label_default AS biologique_statut,
    n6.label_default AS etat_biologique,
    n22.label_default AS biogeographique_statut,
    n7.label_default AS naturalite,
    n8.label_default AS preuve_existante,
    n9.label_default AS niveau_precision_diffusion,
    n10.label_default AS stade_vie,
    n11.label_default AS sexe,
    n12.label_default AS objet_denombrement,
    n13.label_default AS type_denombrement,
    n14.label_default AS niveau_sensibilite,
    n15.label_default AS statut_observation,
    n16.label_default AS floutage_dee,
    n17.label_default AS statut_source,
    n18.label_default AS type_info_geo,
    n19.label_default AS methode_determination,
    n20.label_default AS comportement,
    s.reference_biblio AS reference_biblio,
    s.id_synthese AS id_synthese,
    s.entity_source_pk_value AS id_origine,
    s.unique_id_sinp AS uuid_perm_sinp,
    s.unique_id_sinp_grp AS uuid_perm_grp_sinp,
    s.meta_create_date AS date_creation,
    s.meta_update_date AS date_modification,
    COALESCE(s.meta_update_date, s.meta_create_date) AS derniere_action
   FROM gn_synthese.synthese s
     JOIN taxonomie.taxref t ON t.cd_nom = s.cd_nom
     JOIN gn_meta.t_datasets d ON d.id_dataset = s.id_dataset
     JOIN gn_meta.t_acquisition_frameworks af ON d.id_acquisition_framework = af.id_acquisition_framework
     LEFT OUTER JOIN (
        SELECT id_synthese, string_agg(DISTINCT area_name, ', ') AS communes
        FROM gn_synthese.cor_area_synthese cas
        LEFT OUTER JOIN ref_geo.l_areas a_1 ON cas.id_area = a_1.id_area
        JOIN ref_geo.bib_areas_types ta ON ta.id_type = a_1.id_type AND ta.type_code ='COM'
        GROUP BY id_synthese 
     ) sa ON sa.id_synthese = s.id_synthese
     LEFT JOIN ref_nomenclatures.t_nomenclatures n1 ON s.id_nomenclature_geo_object_nature = n1.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n2 ON s.id_nomenclature_grp_typ = n2.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n3 ON s.id_nomenclature_obs_technique = n3.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n5 ON s.id_nomenclature_bio_status = n5.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n6 ON s.id_nomenclature_bio_condition = n6.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n7 ON s.id_nomenclature_naturalness = n7.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n8 ON s.id_nomenclature_exist_proof = n8.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n9 ON s.id_nomenclature_diffusion_level = n9.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n10 ON s.id_nomenclature_life_stage = n10.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n11 ON s.id_nomenclature_sex = n11.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n12 ON s.id_nomenclature_obj_count = n12.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n13 ON s.id_nomenclature_type_count = n13.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n14 ON s.id_nomenclature_sensitivity = n14.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n15 ON s.id_nomenclature_observation_status = n15.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n16 ON s.id_nomenclature_blurring = n16.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n17 ON s.id_nomenclature_source_status = n17.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n18 ON s.id_nomenclature_info_geo_type = n18.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n19 ON s.id_nomenclature_determination_method = n19.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n20 ON s.id_nomenclature_behaviour = n20.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n21 ON s.id_nomenclature_valid_status = n21.id_nomenclature
     LEFT JOIN ref_nomenclatures.t_nomenclatures n22 ON s.id_nomenclature_biogeo_status = n22.id_nomenclature
     LEFT JOIN ref_habitats.habref hab ON hab.cd_hab = s.cd_hab;

-- Amélioration vue d'export des métadonnées
DROP VIEW gn_synthese.v_metadata_for_export;
CREATE OR REPLACE VIEW gn_synthese.v_metadata_for_export AS
 WITH count_nb_obs AS (
         SELECT count(*) AS nb_obs,
            synthese.id_dataset
           FROM gn_synthese.synthese
          GROUP BY synthese.id_dataset
        )
 SELECT d.dataset_name AS jeu_donnees,
    d.id_dataset AS jdd_id,
    d.unique_dataset_id AS jdd_uuid,
    af.acquisition_framework_name AS cadre_acquisition,
    af.unique_acquisition_framework_id AS ca_uuid,
    string_agg(DISTINCT concat(COALESCE(orga.nom_organisme, ((roles.nom_role::text || ' '::text) || roles.prenom_role::text)::character varying), ' (', nomencl.label_default,')'), ', '::text) AS acteurs,
    count_nb_obs.nb_obs AS nombre_obs
   FROM gn_meta.t_datasets d
     JOIN gn_meta.t_acquisition_frameworks af ON af.id_acquisition_framework = d.id_acquisition_framework
     JOIN gn_meta.cor_dataset_actor act ON act.id_dataset = d.id_dataset
     JOIN ref_nomenclatures.t_nomenclatures nomencl ON nomencl.id_nomenclature = act.id_nomenclature_actor_role
     LEFT JOIN utilisateurs.bib_organismes orga ON orga.id_organisme = act.id_organism
     LEFT JOIN utilisateurs.t_roles roles ON roles.id_role = act.id_role
     JOIN count_nb_obs ON count_nb_obs.id_dataset = d.id_dataset
  GROUP BY d.id_dataset, d.unique_dataset_id, d.dataset_name, af.acquisition_framework_name, af.unique_acquisition_framework_id, count_nb_obs.nb_obs;

-- Correction du trigger de mise à jour de Occtax vers Synthèse (#1117)
CREATE OR REPLACE FUNCTION pr_occtax.fct_tri_synthese_update_releve()
  RETURNS trigger AS
$BODY$
DECLARE
  myobservers text;
BEGIN
  --calcul de l'observateur. On privilégie le ou les observateur(s) de cor_role_releves_occtax
  --Récupération et formatage des observateurs
  SELECT INTO myobservers array_to_string(array_agg(rol.nom_role || ' ' || rol.prenom_role), ', ')
  FROM pr_occtax.cor_role_releves_occtax cor
  JOIN utilisateurs.t_roles rol ON rol.id_role = cor.id_role
  WHERE cor.id_releve_occtax = NEW.id_releve_occtax;
  IF myobservers IS NULL THEN
    myobservers = NEW.observers_txt;
  END IF;
  --mise à jour en synthese des informations correspondant au relevé uniquement
  UPDATE gn_synthese.synthese SET
      id_dataset = NEW.id_dataset,
      observers = myobservers,
      id_digitiser = NEW.id_digitiser,
      grp_method = NEW.grp_method,
      id_nomenclature_grp_typ = NEW.id_nomenclature_grp_typ,
      date_min = date_trunc('day',NEW.date_min)+COALESCE(NEW.hour_min,'00:00:00'::time),
      date_max = date_trunc('day',NEW.date_max)+COALESCE(NEW.hour_max,'00:00:00'::time), 
      altitude_min = NEW.altitude_min,
      altitude_max = NEW.altitude_max,
      depth_min = NEW.depth_min,
      depth_max = NEW.depth_max,
      place_name = NEW.place_name,
      precision = NEW.precision,
      the_geom_local = NEW.geom_local,
      the_geom_4326 = NEW.geom_4326,
      the_geom_point = ST_CENTROID(NEW.geom_4326),
      id_nomenclature_geo_object_nature = NEW.id_nomenclature_geo_object_nature,
      last_action = 'U',
      comment_context = NEW.comment
  WHERE unique_id_sinp IN (SELECT unnest(pr_occtax.get_unique_id_sinp_from_id_releve(NEW.id_releve_occtax::integer)));
  RETURN NULL;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- Mise à jour du champs the_geom_local de la Synthèse pour les observations venant d'Occtax 
-- Par sécurité si ils ont été modifiés (#1117)
UPDATE gn_synthese.synthese 
SET the_geom_local = ST_transform(the_geom_4326, gn_commons.get_default_parameter('local_srid')::integer)
WHERE id_source = (SELECT id_source FROM gn_synthese.t_sources WHERE name_source ilike 'Occtax');


/* GEOFIT - PELOPHYLAX */
ALTER TABLE pr_occtax.t_releves_occtax
    ADD COLUMN additional_fields jsonb;
	
ALTER TABLE pr_occtax.t_occurrences_occtax
    ADD COLUMN additional_fields jsonb;
	
ALTER TABLE pr_occtax.cor_counting_occtax
    ADD COLUMN additional_fields jsonb;

CREATE OR REPLACE FUNCTION pr_occtax.insert_in_synthese(my_id_counting integer)
    RETURNS integer[]
    LANGUAGE 'plpgsql'
    VOLATILE
    PARALLEL UNSAFE
    COST 100
AS $BODY$  DECLARE
  new_count RECORD;
  occurrence RECORD;
  releve RECORD;
  id_source integer;
  id_module integer;
  id_nomenclature_source_status integer;
  myobservers RECORD;
  id_role_loop integer;

  BEGIN
  --recupération du counting à partir de son ID
  SELECT INTO new_count * FROM pr_occtax.cor_counting_occtax WHERE id_counting_occtax = my_id_counting;

  -- Récupération de l'occurrence
  SELECT INTO occurrence * FROM pr_occtax.t_occurrences_occtax occ WHERE occ.id_occurrence_occtax = new_count.id_occurrence_occtax;

  -- Récupération du relevé
  SELECT INTO releve * FROM pr_occtax.t_releves_occtax rel WHERE occurrence.id_releve_occtax = rel.id_releve_occtax;

  -- Récupération de la source
  SELECT INTO id_source s.id_source FROM gn_synthese.t_sources s WHERE name_source ILIKE 'occtax';

  -- Récupération de l'id_module
  SELECT INTO id_module gn_commons.get_id_module_bycode('OCCTAX');

  -- Récupération du status_source depuis le JDD
  SELECT INTO id_nomenclature_source_status d.id_nomenclature_source_status FROM gn_meta.t_datasets d WHERE id_dataset = releve.id_dataset;

  --Récupération et formatage des observateurs
  SELECT INTO myobservers array_to_string(array_agg(rol.nom_role || ' ' || rol.prenom_role), ', ') AS observers_name,
  array_agg(rol.id_role) AS observers_id
  FROM pr_occtax.cor_role_releves_occtax cor
  JOIN utilisateurs.t_roles rol ON rol.id_role = cor.id_role
  WHERE cor.id_releve_occtax = releve.id_releve_occtax;

  -- insertion dans la synthese
  INSERT INTO gn_synthese.synthese (
  unique_id_sinp,
  unique_id_sinp_grp,
  id_source,
  entity_source_pk_value,
  id_dataset,
  id_module,
  id_nomenclature_geo_object_nature,
  id_nomenclature_grp_typ,
  grp_method,
  id_nomenclature_obs_technique,
  id_nomenclature_bio_status,
  id_nomenclature_bio_condition,
  id_nomenclature_naturalness,
  id_nomenclature_exist_proof,
  id_nomenclature_life_stage,
  id_nomenclature_sex,
  id_nomenclature_obj_count,
  id_nomenclature_type_count,
  id_nomenclature_observation_status,
  id_nomenclature_blurring,
  id_nomenclature_source_status,
  id_nomenclature_info_geo_type,
  id_nomenclature_behaviour,
  count_min,
  count_max,
  cd_nom,
  cd_hab,
  nom_cite,
  meta_v_taxref,
  sample_number_proof,
  digital_proof,
  non_digital_proof,
  altitude_min,
  altitude_max,
  depth_min,
  depth_max,
  place_name,
  precision,
  the_geom_4326,
  the_geom_point,
  the_geom_local,
  date_min,
  date_max,
  observers,
  determiner,
  id_digitiser,
  id_nomenclature_determination_method,
  comment_context,
  comment_description,
  last_action,
	--CHAMPS ADDITIONNELS OCCTAX
  additional_data
  )
  VALUES(
    new_count.unique_id_sinp_occtax,
    releve.unique_id_sinp_grp,
    id_source,
    new_count.id_counting_occtax,
    releve.id_dataset,
    id_module,
    releve.id_nomenclature_geo_object_nature,
    releve.id_nomenclature_grp_typ,
    releve.grp_method,
    occurrence.id_nomenclature_obs_technique,
    occurrence.id_nomenclature_bio_status,
    occurrence.id_nomenclature_bio_condition,
    occurrence.id_nomenclature_naturalness,
    occurrence.id_nomenclature_exist_proof,
    new_count.id_nomenclature_life_stage,
    new_count.id_nomenclature_sex,
    new_count.id_nomenclature_obj_count,
    new_count.id_nomenclature_type_count,
    occurrence.id_nomenclature_observation_status,
    occurrence.id_nomenclature_blurring,
    -- status_source récupéré depuis le JDD
    id_nomenclature_source_status,
    -- id_nomenclature_info_geo_type: type de rattachement = non saisissable: georeferencement
    ref_nomenclatures.get_id_nomenclature('TYP_INF_GEO', '1'),
    occurrence.id_nomenclature_behaviour,
    new_count.count_min,
    new_count.count_max,
    occurrence.cd_nom,
    releve.cd_hab,
    occurrence.nom_cite,
    occurrence.meta_v_taxref,
    occurrence.sample_number_proof,
    occurrence.digital_proof,
    occurrence.non_digital_proof,
    releve.altitude_min,
    releve.altitude_max,
    releve.depth_min,
    releve.depth_max,
    releve.place_name,
    releve.precision,
    releve.geom_4326,
    ST_CENTROID(releve.geom_4326),
    releve.geom_local,
    date_trunc('day',releve.date_min)+COALESCE(releve.hour_min,'00:00:00'::time),
    date_trunc('day',releve.date_max)+COALESCE(releve.hour_max,'00:00:00'::time),
    COALESCE (myobservers.observers_name, releve.observers_txt),
    occurrence.determiner,
    releve.id_digitiser,
    occurrence.id_nomenclature_determination_method,
    releve.comment,
    occurrence.comment,
    'I',
	  --CHAMPS ADDITIONNELS OCCTAX
	  new_count.additional_fields || occurrence.additional_fields || releve.additional_fields
  );

    RETURN myobservers.observers_id ;
  END;
  $BODY$;

CREATE OR REPLACE FUNCTION pr_occtax.fct_tri_synthese_update_counting()
  RETURNS trigger
  LANGUAGE 'plpgsql'
  VOLATILE
  COST 100
AS $BODY$DECLARE
  occurrence RECORD;
  releve RECORD;
BEGIN

  -- Récupération de l'occurrence
  SELECT INTO occurrence * FROM pr_occtax.t_occurrences_occtax occ WHERE occ.id_occurrence_occtax = NEW.id_occurrence_occtax;
  -- Récupération du relevé
  SELECT INTO releve * FROM pr_occtax.t_releves_occtax rel WHERE occurrence.id_releve_occtax = rel.id_releve_occtax;
  
-- Update dans la synthese
  UPDATE gn_synthese.synthese
  SET
  entity_source_pk_value = NEW.id_counting_occtax,
  id_nomenclature_life_stage = NEW.id_nomenclature_life_stage,
  id_nomenclature_sex = NEW.id_nomenclature_sex,
  id_nomenclature_obj_count = NEW.id_nomenclature_obj_count,
  id_nomenclature_type_count = NEW.id_nomenclature_type_count,
  count_min = NEW.count_min,
  count_max = NEW.count_max,
  last_action = 'U',
  --CHAMPS ADDITIONNELS OCCTAX
  additional_data = NEW.additional_fields || occurrence.additional_fields || releve.additional_fields
  WHERE unique_id_sinp = NEW.unique_id_sinp_occtax;
  IF(NEW.unique_id_sinp_occtax <> OLD.unique_id_sinp_occtax) THEN
      RAISE EXCEPTION 'ATTENTION : %', 'Le champ "unique_id_sinp_occtax" est généré par GeoNature et ne doit pas être changé.'
          || chr(10) || 'Il est utilisé par le SINP pour identifier de manière unique une observation.'
          || chr(10) || 'Si vous le changez, le SINP considérera cette observation comme une nouvelle observation.'
          || chr(10) || 'Si vous souhaitez vraiment le changer, désactivez ce trigger, faite le changement, réactiez ce trigger'
          || chr(10) || 'ET répercutez manuellement les changements dans "gn_synthese.synthese".';
  END IF;
  RETURN NULL;
END;
$BODY$;

CREATE OR REPLACE FUNCTION pr_occtax.fct_tri_synthese_update_occ()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    VOLATILE
    COST 100
AS $BODY$  DECLARE
  BEGIN
    UPDATE gn_synthese.synthese SET
      id_nomenclature_obs_technique = NEW.id_nomenclature_obs_technique,
      id_nomenclature_bio_condition = NEW.id_nomenclature_bio_condition,
      id_nomenclature_bio_status = NEW.id_nomenclature_bio_status,
      id_nomenclature_naturalness = NEW.id_nomenclature_naturalness,
      id_nomenclature_exist_proof = NEW.id_nomenclature_exist_proof,
      id_nomenclature_observation_status = NEW.id_nomenclature_observation_status,
      id_nomenclature_blurring = NEW.id_nomenclature_blurring,
      id_nomenclature_source_status = NEW.id_nomenclature_source_status,
      determiner = NEW.determiner,
      id_nomenclature_determination_method = NEW.id_nomenclature_determination_method,
      id_nomenclature_behaviour = id_nomenclature_behaviour,
      cd_nom = NEW.cd_nom,
      nom_cite = NEW.nom_cite,
      meta_v_taxref = NEW.meta_v_taxref,
      sample_number_proof = NEW.sample_number_proof,
      digital_proof = NEW.digital_proof,
      non_digital_proof = NEW.non_digital_proof,
      comment_description = NEW.comment,
      last_action = 'U',
	  --CHAMPS ADDITIONNELS OCCTAX
	  additional_data = NEW.additional_fields || pr_occtax.t_releves_occtax.additional_fields || pr_occtax.cor_counting_occtax.additional_fields
	FROM pr_occtax.t_releves_occtax
	INNER JOIN pr_occtax.cor_counting_occtax ON NEW.id_occurrence_occtax = pr_occtax.cor_counting_occtax.id_occurrence_occtax
    WHERE unique_id_sinp = pr_occtax.cor_counting_occtax.unique_id_sinp_occtax;
	
    RETURN NULL;
  END;
  $BODY$;

CREATE OR REPLACE FUNCTION pr_occtax.fct_tri_synthese_update_releve()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    VOLATILE
    COST 100
AS $BODY$  DECLARE
    myobservers text;
  BEGIN
    --calcul de l'observateur. On privilégie le ou les observateur(s) de cor_role_releves_occtax
    --Récupération et formatage des observateurs
    SELECT INTO myobservers array_to_string(array_agg(rol.nom_role || ' ' || rol.prenom_role), ', ')
    FROM pr_occtax.cor_role_releves_occtax cor
    JOIN utilisateurs.t_roles rol ON rol.id_role = cor.id_role
    WHERE cor.id_releve_occtax = NEW.id_releve_occtax;
    IF myobservers IS NULL THEN
      myobservers = NEW.observers_txt;
    END IF;
    --mise à jour en synthese des informations correspondant au relevé uniquement
    UPDATE gn_synthese.synthese SET
        id_dataset = NEW.id_dataset,
        observers = myobservers,
        id_digitiser = NEW.id_digitiser,
        grp_method = NEW.grp_method,
        id_nomenclature_grp_typ = NEW.id_nomenclature_grp_typ,
        date_min = date_trunc('day',NEW.date_min)+COALESCE(NEW.hour_min,'00:00:00'::time),
        date_max = date_trunc('day',NEW.date_max)+COALESCE(NEW.hour_max,'00:00:00'::time),
        altitude_min = NEW.altitude_min,
        altitude_max = NEW.altitude_max,
        depth_min = NEW.depth_min,
        depth_max = NEW.depth_max,
        place_name = NEW.place_name,
        precision = NEW.precision,
        the_geom_4326 = NEW.geom_4326,
        the_geom_point = ST_CENTROID(NEW.geom_4326),
        id_nomenclature_geo_object_nature = NEW.id_nomenclature_geo_object_nature,
        last_action = 'U',
        comment_context = NEW.comment,
	  --CHAMPS ADDITIONNELS OCCTAX
		additional_data = NEW.additional_fields || occurrence.additional_fields || counting.additional_fields
	FROM pr_occtax.t_occurrences_occtax occurrence 
	INNER JOIN pr_occtax.cor_counting_occtax counting
		ON counting.id_occurrence_occtax = occurrence.id_occurrence_occtax
		AND NEW.id_releve_occtax = occurrence.id_releve_occtax
	WHERE unique_id_sinp IN (SELECT unnest(pr_occtax.get_unique_id_sinp_from_id_releve(NEW.id_releve_occtax::integer)));
    RETURN NULL;
  END;
  $BODY$;
  


  -- Révision de la vue des exports Occtax
  CREATE OR REPLACE VIEW pr_occtax.v_export_occtax AS
  SELECT
      rel.unique_id_sinp_grp as "idSINPRegroupement",
      ref_nomenclatures.get_cd_nomenclature(rel.id_nomenclature_grp_typ) AS "typGrp",
      rel.grp_method AS "methGrp",
      ccc.unique_id_sinp_occtax AS "permId",
      ccc.id_counting_occtax AS "idOrigine",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_observation_status) AS "statObs",
      occ.nom_cite AS "nomCite",
      to_char(rel.date_min, 'YYYY-MM-DD'::text) AS "dateDebut",
      to_char(rel.date_max, 'YYYY-MM-DD'::text) AS "dateFin",
      rel.hour_min AS "heureDebut",
      rel.hour_max AS "heureFin",
      rel.altitude_max AS "altMax",
      rel.altitude_min AS "altMin",
      rel.depth_min AS "profMin",
      rel.depth_max AS "profMax",
      occ.cd_nom AS "cdNom",
      tax.cd_ref AS "cdRef",
      ref_nomenclatures.get_nomenclature_label(d.id_nomenclature_data_origin) AS "dSPublique",
      d.unique_dataset_id AS "jddMetaId",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_source_status) AS "statSource",
      d.dataset_name AS "jddCode",
      d.unique_dataset_id AS "jddId",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_obs_technique) AS "obsTech",
      ref_nomenclatures.get_nomenclature_label(rel.id_nomenclature_tech_collect_campanule) AS "techCollect",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_bio_condition) AS "ocEtatBio",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_naturalness) AS "ocNat",
      ref_nomenclatures.get_nomenclature_label(ccc.id_nomenclature_sex) AS "ocSex",
      ref_nomenclatures.get_nomenclature_label(ccc.id_nomenclature_life_stage) AS "ocStade",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_bio_status) AS "ocStatBio",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_exist_proof) AS "preuveOui",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_determination_method) AS "ocMethDet",
      ref_nomenclatures.get_nomenclature_label(occ.id_nomenclature_behaviour) AS "occComp",
      occ.digital_proof AS "preuvNum",
      occ.non_digital_proof AS "preuvNoNum",
      rel.comment AS "obsCtx",
      occ.comment AS "obsDescr",
      rel.unique_id_sinp_grp AS "permIdGrp",
      ccc.count_max AS "denbrMax",
      ccc.count_min AS "denbrMin",
      ref_nomenclatures.get_nomenclature_label(ccc.id_nomenclature_obj_count) AS "objDenbr",
      ref_nomenclatures.get_nomenclature_label(ccc.id_nomenclature_type_count) AS "typDenbr",
      COALESCE(string_agg(DISTINCT (r.nom_role::text || ' '::text) || r.prenom_role::text, ','::text), rel.observers_txt::text) AS "obsId",
      COALESCE(string_agg(DISTINCT o.nom_organisme::text, ','::text), 'NSP'::text) AS "obsNomOrg",
      COALESCE(occ.determiner, 'Inconnu'::character varying) AS "detId",
      ref_nomenclatures.get_nomenclature_label(rel.id_nomenclature_geo_object_nature) AS "natObjGeo",
      st_astext(rel.geom_4326) AS "WKT",
      -- 'In'::text AS "natObjGeo",
      tax.lb_nom AS "nomScienti",
      tax.nom_vern AS "nomVern",
      hab.lb_code AS "codeHab",
      hab.lb_hab_fr AS "nomHab",
      hab.cd_hab,
      rel.date_min,
      rel.date_max,
      rel.id_dataset,
      rel.id_releve_occtax,
      occ.id_occurrence_occtax,
      rel.id_digitiser,
      rel.geom_4326,
      rel.place_name AS "nomLieu",
      rel.precision,
      (occ.additional_fields || rel.additional_fields) || ccc.additional_fields AS additional_data,
      ( SELECT string_agg(media.title_fr::text, ' - '::text) AS string_agg
            FROM gn_commons.t_medias media
              JOIN gn_commons.bib_tables_location tab_loc ON tab_loc.id_table_location = media.id_table_location
            WHERE tab_loc.table_name::text = 'cor_counting_occtax'::text AND ccc.unique_id_sinp_occtax = media.uuid_attached_row) AS "titreMedias",
      ( SELECT string_agg(media.description_fr, ' - '::text) AS string_agg
            FROM gn_commons.t_medias media
              JOIN gn_commons.bib_tables_location tab_loc ON tab_loc.id_table_location = media.id_table_location
            WHERE tab_loc.table_name::text = 'cor_counting_occtax'::text AND ccc.unique_id_sinp_occtax = media.uuid_attached_row) AS "descriptionMedias",
      ( SELECT string_agg(
                  CASE
                      WHEN media.media_path IS NOT NULL THEN concat(gn_commons.get_default_parameter('url_api'::text), '/', media.media_path)::character varying
                      ELSE media.media_url
                  END::text, ' - '::text) AS string_agg
            FROM gn_commons.t_medias media
              JOIN gn_commons.bib_tables_location tab_loc ON tab_loc.id_table_location = media.id_table_location
            WHERE tab_loc.table_name::text = 'cor_counting_occtax'::text AND ccc.unique_id_sinp_occtax = media.uuid_attached_row) AS "URLMedias"
    FROM pr_occtax.t_releves_occtax rel
      LEFT JOIN pr_occtax.t_occurrences_occtax occ ON rel.id_releve_occtax = occ.id_releve_occtax
      LEFT JOIN pr_occtax.cor_counting_occtax ccc ON ccc.id_occurrence_occtax = occ.id_occurrence_occtax
      LEFT JOIN taxonomie.taxref tax ON tax.cd_nom = occ.cd_nom
      LEFT JOIN gn_meta.t_datasets d ON d.id_dataset = rel.id_dataset
      LEFT JOIN pr_occtax.cor_role_releves_occtax cr ON cr.id_releve_occtax = rel.id_releve_occtax
      LEFT JOIN utilisateurs.t_roles r ON r.id_role = cr.id_role
      LEFT JOIN utilisateurs.bib_organismes o ON o.id_organisme = r.id_organisme
      LEFT JOIN ref_habitats.habref hab ON hab.cd_hab = rel.cd_hab
    GROUP BY ccc.id_counting_occtax,occ.id_occurrence_occtax,rel.id_releve_occtax,d.id_dataset
    ,tax.cd_ref , tax.lb_nom, tax.nom_vern , hab.cd_hab, hab.lb_code, hab.lb_hab_fr
    ;

/* GEOFIT - PELOPHYLAX FIN */