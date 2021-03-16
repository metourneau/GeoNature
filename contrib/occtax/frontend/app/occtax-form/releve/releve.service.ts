import { Injectable, ViewContainerRef, ComponentRef, ComponentFactory, ComponentFactoryResolver } from "@angular/core";
import { FormBuilder, FormGroup, FormControl, Validators } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Observable, Subscription } from "rxjs";
import { filter, map, switchMap, tap } from "rxjs/operators";
import { NgbDateParserFormatter } from "@ng-bootstrap/ng-bootstrap";
import { GeoJSON } from "leaflet";
import { ModuleConfig } from "../../module.config";
import { CommonService } from "@geonature_common/service/common.service";
import { FormService } from "@geonature_common/form/form.service";
import { DataFormService } from "@geonature_common/form/data-form.service";
import { OcctaxFormService } from "../occtax-form.service";
import { OcctaxFormMapService } from "../map/map.service";
import { OcctaxDataService } from "../../services/occtax-data.service";
import { OcctaxFormParamService } from "../form-param/form-param.service";
import { dynamicFormReleveComponent } from "../dynamique-form-releve/dynamic-form-releve.component";

@Injectable()
export class OcctaxFormReleveService {
  public userReleveRigth: any;
  public $_autocompleteDate: Subscription = new Subscription();

  public propertiesForm: FormGroup;
  public habitatForm = new FormControl();
  public releve: any;
  public geojson: GeoJSON;
  public releveForm: FormGroup;
  public showTime: boolean = false; //gestion de l'affichage des infos complémentaires de temps
  public waiting: boolean = false;
  public route: ActivatedRoute;
  
  public dynamicFormGroup: FormGroup;
  public currentIdDataset:any;
  public dynamicContainer: ViewContainerRef;
  componentRef: ComponentRef<any>;

  public datasetId : number = null;
  public previousReleve = null;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private _commonService: CommonService,
    private dateParser: NgbDateParserFormatter,
    private coreFormService: FormService,
    private dataFormService: DataFormService,
    private occtaxFormService: OcctaxFormService,
    private occtaxFormMapService: OcctaxFormMapService,
    private occtaxDataService: OcctaxDataService,
    private occtaxParamS: OcctaxFormParamService,
    private _resolver: ComponentFactoryResolver,
    private _route: ActivatedRoute,
  ) {
    this.initPropertiesForm();
    this.setObservables();

    this.releveForm = this.fb.group({
      geometry: this.occtaxFormMapService.geometry,
      properties: this.propertiesForm,
    });
  }

  private get initialValues() {
    /*MET Si on passe jdd en paramètre, alors on rempli le champs dataset avec la valeur et on rempli la valeur par défault*/
    this._route.queryParams.subscribe(params => {
      let datasetId = params["jdd"];
      if (datasetId){
        this.datasetId = datasetId;
      } 
    });
    return {
      id_digitiser: this.occtaxFormService.currentUser.id_role,
      meta_device_entry: "web",
      observers: [this.occtaxFormService.currentUser],
      id_dataset: this.datasetId
    };
  }

  initPropertiesForm(): void {
    //FORM
    this.propertiesForm = this.fb.group({
      id_dataset: [null, Validators.required] ,
      id_digitiser: null,
      date_min: [null, Validators.required],
      date_max: [null, Validators.required],
      hour_min: [
        null,
        Validators.pattern(
          "^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$"
        ),
      ],
      hour_max: [
        null,
        Validators.pattern(
          "^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$"
        ),
      ],
      altitude_min: null,
      altitude_max: null,
      depth_min: null,
      depth_max: null,
      place_name: null,
      meta_device_entry: null,
      comment: null,
      cd_hab: null,
      id_nomenclature_tech_collect_campanule: null,
      observers: [
        null,
        !ModuleConfig.observers_txt ? Validators.required : null,
      ],
      observers_txt: [
        null,
        ModuleConfig.observers_txt ? Validators.required : null,
      ],
      id_nomenclature_grp_typ: null,
      grp_method: null,
      id_nomenclature_geo_object_nature: null,
      precision: null
    });

    this.propertiesForm.patchValue(this.initialValues);

    // VALIDATORS
    this.propertiesForm.setValidators([
      this.coreFormService.dateValidator(
        this.propertiesForm.get("date_min"),
        this.propertiesForm.get("date_max")
      ),
      this.coreFormService.hourAndDateValidator(
        this.propertiesForm.get("date_min"),
        this.propertiesForm.get("date_max"),
        this.propertiesForm.get("hour_min"),
        this.propertiesForm.get("hour_max")
      ),
      this.coreFormService.minMaxValidator(
        this.propertiesForm.get("altitude_min"),
        this.propertiesForm.get("altitude_max"),
        "invalidAlt"
      ),
      this.coreFormService.minMaxValidator(
        this.propertiesForm.get("depth_min"),
        this.propertiesForm.get("depth_max"),
        "invalidDepth"
      ),
    ]);

    //on desactive le form, il sera réactivé si la geom est ok
    this.propertiesForm.disable();
  }
  
  onDatasetChanged(idDataset) {
    let hasDynamicForm = false;
    let dynamiqueFormDataset = this.occtaxFormService.getAddDynamiqueFields(idDataset);
    if (dynamiqueFormDataset){
      if (dynamiqueFormDataset["RELEVE"]){
        hasDynamicForm = true;
      }
    }

    if (hasDynamicForm){
      let disableForm = this.propertiesForm.disabled ? true : false;
      
      this.dynamicContainer.clear(); 
      const factory: ComponentFactory<any> = this._resolver.resolveComponentFactory(dynamicFormReleveComponent);
      this.componentRef = this.dynamicContainer.createComponent(factory);

      if(!this.dynamicFormGroup){
        this.dynamicFormGroup = this.fb.group({});
      }
      this.componentRef.instance.formConfigReleveDataSet = dynamiqueFormDataset["RELEVE"];
      this.componentRef.instance.formArray = this.dynamicFormGroup;
      this.propertiesForm.setControl("additional_fields", this.dynamicFormGroup);
      
      //On charge les nomenclatures additionnels
      let NOMENCLATURES = [];
      dynamiqueFormDataset["RELEVE"].map((widget) => {
        if(widget.type_widget == "nomenclature"){
          NOMENCLATURES.push(widget.code_nomenclature_type);
        }
      })

      this.dataFormService.getNomenclatures(NOMENCLATURES)
      .pipe(
        map((data) => {
          let values = [];
          for (let i = 0; i < data.length; i++) {
            data[i].values.forEach((element) => {
              element["nomenclature_mnemonique"] = data[i]["mnemonique"];
              values[element.id_nomenclature] = element;
            });
          }
          return values;
        })
      )
      .subscribe((nomenclatures) => (this.occtaxFormService.nomenclatureAdditionnel = nomenclatures));
      //dans le cas d'une création avec le jdd passé en paramètre, l'ajout du control dynamique désactive le formulaire
      //Donc on force la réactivation 
      if(disableForm){
        //Mystère du disabled, il faut le mettre 2 fois dans un timeout pour que le formulaire se désactive
        setTimeout(() => this.propertiesForm.disable(), 100);
        setTimeout(() => this.propertiesForm.disable(), 500);
      }
    }else{
      if (this.propertiesForm.get("additional_fields")){
        this.propertiesForm.removeControl("additional_fields")
      }
      if ( this.dynamicContainer){
        this.dynamicContainer.clear(); 
      }
    }
  }

  /**
   * Initialise les observables pour la mise en place des actions automatiques
   **/
  private setObservables() {
    //patch le form par les valeurs par defaut si creation
    this.occtaxFormService.editionMode
      .pipe(
        tap((editionMode: boolean) => {
          // gestion de l'autocomplétion de la date ou non.
          this.$_autocompleteDate.unsubscribe();
          // autocomplete si mode création ou si mode edition et date_min = date_max
          if (!editionMode) {
            this.$_autocompleteDate = this.coreFormService.autoCompleteDate(
              this.propertiesForm as FormGroup,
              "date_min",
              "date_max"
            );
          }
        }),
        switchMap((editionMode: boolean) => {
          //Le switch permet, selon si édition ou creation, de récuperer les valeur par defaut ou celle de l'API
          return editionMode ? this.releveValues : this.defaultValues;
        })
      )
      .subscribe((values) => this.propertiesForm.patchValue(values)); //filter((editionMode: boolean) => !editionMode))

    //Observation de la geometry pour récupere les info d'altitudes
    this.occtaxFormMapService.geojson
      .pipe(
        filter((geojson) => geojson !== null),
        tap((geojson) => {
          //geom valide
          if (!this.occtaxFormService.editionMode.getValue()) {
            //recup des info d'altitude uniquement en mode creation
            this.getAltitude(geojson);
          }
          this.propertiesForm.enable(); //active le form
        })
      )
      .subscribe((geojson) => (this.geojson = geojson));

    // AUTOCORRECTION de hour
    // si le champ est une chaine vide ('') on reset la valeur null
    this.propertiesForm
      .get("hour_min")
      .valueChanges.pipe(filter((hour) => hour && hour.length == 0))
      .subscribe((hour) => {
        this.propertiesForm.get("hour_min").reset();
      });

    this.propertiesForm
      .get("hour_max")
      .valueChanges.pipe(filter((hour) => hour && hour.length == 0))
      .subscribe((hour) => {
        this.propertiesForm.get("hour_max").reset();
      });

    // AUTOCOMPLETE DE hour_max par hour_min UNIQUEMENT SI editionMode = FAUX
    this.propertiesForm
      .get("hour_min")
      .valueChanges.pipe(
        filter(
          (hour) =>
            !this.occtaxFormService.editionMode.getValue() && hour != null
        )
      )
      .subscribe((hour) => {
        if (
          // autcomplete only if hour max is empty or invalid
          this.propertiesForm.get("hour_max").invalid ||
          this.propertiesForm.get("hour_max").value == null
        ) {
          this.propertiesForm.get("hour_max").setValue(hour);
        }
      });
  }

  /** Get occtax data and patch value to the form */
  private get releveValues(): Observable<any> {
    return this.occtaxFormService.occtaxData.pipe(
      filter((data) => data && data.releve.properties),
      map((data) => {
        const releve = data.releve.properties;

        //Parfois il passe 2 fois ici, et la seconde fois la date est déja formattée en objet, si c'est le cas, on saute
        if(typeof releve.date_min !== "object"){
          // on affiche la date_max si date_min != date_max
          if (releve.date_min != releve.date_max) {
            this.showTime = true;
          }
          // si les date sont égales, on active l'autocomplete pour garder la correlation
          else {
            this.$_autocompleteDate.unsubscribe()
            this.$_autocompleteDate = this.coreFormService.autoCompleteDate(
              this.propertiesForm as FormGroup,
              "date_min",
              "date_max"
            );
          }

          releve.date_min = this.occtaxFormService.formatDate(releve.date_min);
          releve.date_max = this.occtaxFormService.formatDate(releve.date_max);
        }else{
          if (releve.date_min.year != releve.date_max.year || releve.date_min.month != releve.date_max.month || releve.date_min.day != releve.date_max.day) {
            this.showTime = true;
          }
        }

        // set habitat form value from 
        if (releve.habitat) {
          const habitatFormValue = releve.habitat;
          // set search_name properties to the form
          habitatFormValue["search_name"] = habitatFormValue.lb_code + " - " + habitatFormValue.lb_hab_fr;
          this.habitatForm.setValue(habitatFormValue)
        }

        /*MET Champs additionnel*/
        let dynamiqueFormDataset = this.occtaxFormService.getAddDynamiqueFields(releve.id_dataset);
        if (dynamiqueFormDataset){
          if (dynamiqueFormDataset["RELEVE"]){
            this.dynamicFormGroup = this.fb.group({});
            dynamiqueFormDataset["RELEVE"].map((widget) => {
              //Formattage des dates
              if(widget.type_widget == "date"){
                //On peut passer plusieurs fois ici, donc on vérifie que la date n'est pas déja formattée
                if(typeof releve.additional_fields[widget.attribut_name] !== "object"){
                  releve.additional_fields[widget.attribut_name] = this.occtaxFormService.formatDate(releve.additional_fields[widget.attribut_name]);
                }
              }
              //Formattage des nomenclatures
              if(widget.type_widget == "nomenclature"){
                this.dataFormService.getNomenclatures([widget.code_nomenclature_type])
                  .pipe(
                    map((data) => {
                      let values = [];
                      for (let i = 0; i < data.length; i++) {
                        data[i].values.forEach((element) => {
                          element["nomenclature_mnemonique"] = data[i]["mnemonique"];
                          values[element.id_nomenclature] = element;
                        });
                      }
                      return values;
                    })
                  )
                  .subscribe((nomenclatures) => {
                    const res = nomenclatures.filter((item) => item !== undefined)
                    .find(n => (n["label_fr"] === releve.additional_fields[widget.attribut_name]));
                    if(res){
                      releve.additional_fields[widget.attribut_name] = res.id_nomenclature;
                    }else{
                      releve.additional_fields[widget.attribut_name] = "";
                    }
                    releve[widget.attribut_name] =  releve.additional_fields[widget.attribut_name];
                    this.dynamicFormGroup.setControl(widget.attribut_name, new FormControl(releve.additional_fields[widget.attribut_name]));
                    //this.propertiesForm.setControl("additional_fields", this.dynamicFormGroup);
                  });
                }
                releve[widget.attribut_name] =  releve.additional_fields[widget.attribut_name];
                this.dynamicFormGroup.addControl(widget.attribut_name, new FormControl(releve.additional_fields[widget.attribut_name]));
                
            })
            this.propertiesForm.setControl("additional_fields", this.dynamicFormGroup);
          }
        }

        return releve;
      })
    );
  }

  private defaultDateWithToday() {
    if (!ModuleConfig.DATE_FORM_WITH_TODAY) {
      return null;
    } else {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      };
    }
  }

  getPreviousReleve(previousReleve) {
    if (previousReleve && !ModuleConfig.ENABLE_SETTINGS_TOOLS) {
      console.log(previousReleve);

      return {
        "id_dataset": previousReleve.properties.id_dataset,
        "observers": previousReleve.properties.observers,
        "observers_txt": previousReleve.properties.observers_txt,
        "date_min": this.occtaxFormService.formatDate(previousReleve.properties.date_min),
        "date_max": this.occtaxFormService.formatDate(previousReleve.properties.date_max),
        "hour_min": previousReleve.properties.hour_min,
        "hour_max": previousReleve.properties.hour_max,
      }
    }
    return {
      "id_dataset": null,
      "observers": null,
      "observers_txt": null,
      "date_min": null,
      "date_max": null,
      "hour_min": null,
      "hour_max": null,
    };
  }

  private get defaultValues(): Observable<any> {
    return this.occtaxFormService
      .getDefaultValues(this.occtaxFormService.currentUser.id_organisme)
      .pipe(
        map((data) => {
          const previousReleve = this.getPreviousReleve(this.occtaxFormService.previousReleve);
          return {
            id_dataset: this.datasetId || this.occtaxParamS.get("releve.id_dataset") || previousReleve.id_dataset,
            date_min: this.occtaxParamS.get("releve.date_min") ||
              previousReleve.date_min ||
              this.defaultDateWithToday(),
            date_max: this.occtaxParamS.get("releve.date_max") || previousReleve.date_max,
            hour_min: this.occtaxParamS.get("releve.hour_min") || previousReleve.hour_min,
            hour_max: this.occtaxParamS.get("releve.hour_max") || previousReleve.hour_max,
            altitude_min: this.occtaxParamS.get("releve.altitude_min"),
            altitude_max: this.occtaxParamS.get("releve.altitude_max"),
            meta_device_entry: "web",
            comment: this.occtaxParamS.get("releve.comment"),
            observers: this.occtaxParamS.get("releve.observers") ||
              previousReleve.observers ||
              (ModuleConfig.observers_txt ? null : [this.occtaxFormService.currentUser]),
            observers_txt: this.occtaxParamS.get("releve.observers_txt") || previousReleve.observers_txt,
            id_nomenclature_grp_typ:
              this.occtaxParamS.get("releve.id_nomenclature_grp_typ") ||
              data["TYP_GRP"],
            grp_method: this.occtaxParamS.get("releve.grp_method"),
            id_nomenclature_tech_collect_campanule:
              this.occtaxParamS.get("releve.id_nomenclature_tech_collect_campanule") ||
              data["TECHNIQUE_OBS"],
            id_nomenclature_geo_object_nature:
              this.occtaxParamS.get(
                "releve.id_nomenclature_geo_object_nature"
              ) || data["NAT_OBJ_GEO"],
          };
        })
      );
  }

  private getAltitude(geojson) {
    // get to geo info from API
    this.dataFormService.getGeoInfo(geojson).subscribe((res) => {
      this.propertiesForm.patchValue({
        altitude_min: res.altitude.altitude_min,
        altitude_max: res.altitude.altitude_max,
      });
    });
  }

  releveFormValue() {
    let value = JSON.parse(JSON.stringify(this.releveForm.value))

    value.properties.date_min = this.dateParser.format(
      value.properties.date_min
    );
    value.properties.date_max = this.dateParser.format(
      value.properties.date_max
    );
    if (!ModuleConfig.observers_txt) {
      value.properties.observers = value.properties.observers.map(
        (observer) => observer.id_role
      );
    }

    /* Champs additionnels - formatter les dates et les nomenclatures */
    let dynamiqueFormDataset = this.occtaxFormService.getAddDynamiqueFields(value.properties.id_dataset);
    if (dynamiqueFormDataset){
      if (dynamiqueFormDataset["RELEVE"]){
        dynamiqueFormDataset["RELEVE"].map((widget) => {
          if(widget.type_widget == "date"){
            value.properties.additional_fields[widget.attribut_name] = this.dateParser.format(
              value.properties.additional_fields[widget.attribut_name]
            );
          }
          if(widget.type_widget == "nomenclature"){
            const res = this.occtaxFormService.nomenclatureAdditionnel.filter((item) => item !== undefined)
            .find(n => n["id_nomenclature"] === value.properties.additional_fields[widget.attribut_name]);
            if(res){
              value.properties.additional_fields[widget.attribut_name] = res.label_fr;
            }else{
              value.properties.additional_fields[widget.attribut_name] = "";
            }
          }
        })
      }
    }

    return value;
  }

  submitReleve() {
    this.waiting = true;
    if (this.occtaxFormService.id_releve_occtax.getValue()) {
      //update
      this.occtaxDataService
        .updateReleve(
          this.occtaxFormService.id_releve_occtax.getValue(),
          this.releveFormValue()
        )
        .pipe(tap(() => (this.waiting = false)))
        .subscribe(
          (data: any) => {
            this._commonService.translateToaster(
              "info",
              "Releve.Infos.ReleveModified"
            );
            this.occtaxFormService.replaceReleveData(data);
            this.releveForm.markAsPristine();
            this.router.navigate(["taxons"], {
              relativeTo: this.route,
            });
          },
          (err) => {
            this.waiting = false;
            this._commonService.translateToaster("error", "ErrorMessage");
          }
        );
    } else {
      // console.log(this.releveForm.value);

      this.occtaxFormService.previousReleve = JSON.parse(JSON.stringify(this.releveForm.value));
      //create
      this.occtaxDataService
        .createReleve(this.releveFormValue())
        .pipe(tap(() => (this.waiting = false)))
        .subscribe(
          (data: any) => {
            this._commonService.translateToaster(
              "info",
              "Releve.Infos.ReleveAdded"
            );
            this.router.navigate([data.id, "taxons"], {
              relativeTo: this.route,
            });
          },
          (err) => {
            this.waiting = false;
            this._commonService.translateToaster("error", "ErrorMessage");
          }
        );
    }
  }

  reset() {
    this.propertiesForm.reset(this.initialValues);
    this.propertiesForm.disable();
  }
}
