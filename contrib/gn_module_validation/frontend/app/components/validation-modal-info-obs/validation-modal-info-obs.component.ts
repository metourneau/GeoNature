import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { ValidationDataService } from "../../services/data.service";
import { SyntheseDataService } from "@geonature_common/form/synthese-form/synthese-data.service";
import { DataFormService } from "@geonature_common/form/data-form.service";
import { AppConfig } from "@geonature_config/app.config";
import { MapListService } from "@geonature_common/map-list/map-list.service";
import { ModuleConfig } from "../../module.config";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { CommonService } from "@geonature_common/service/common.service";
import { MediaService } from "@geonature_common/service/media.service";

@Component({
  selector: "pnx-validation-modal-info-obs",
  templateUrl: "validation-modal-info-obs.component.html",
  styleUrls: ["./validation-modal-info-obs.component.scss"],
  providers: [MapListService]
})
export class ValidationModalInfoObsComponent implements OnInit {
  public selectObsTaxonInfo;
  public selectedObsTaxonDetail;
  public validationHistory: any;
  public SYNTHESE_CONFIG = AppConfig.SYNTHESE;
  public APP_CONFIG = AppConfig;
  public filteredIds;
  public formatedAreas = [];
  public position;
  public lastFilteredValue;
  public isNextButtonValid: any;
  public isPrevButtonValid: any;
  public VALIDATION_CONFIG = ModuleConfig;
  public statusForm: FormGroup;
  public edit;
  public validationStatus;
  public MapListService;
  public email;
  public mailto: String;
  public showEmail;
  public validationDate;
  public currentCdNomenclature;
  public emailContent;

  @Input() selectedObs: any;
  @Input() id_synthese: any;
  @Output() modifiedStatus = new EventEmitter();
  @Output() valDate = new EventEmitter();

  constructor(
    public mapListService: MapListService,
    private _gnDataService: DataFormService,
    private _validatioDataService: ValidationDataService,
    private _syntheseDataService: SyntheseDataService,
    public activeModal: NgbActiveModal,
    private _fb: FormBuilder,
    private _commonService: CommonService,
    public mediaService: MediaService,
  ) {
    // form used for changing validation status
    this.statusForm = this._fb.group({
      statut: ["", Validators.required],
      comment: [""]
    });
  }

  ngOnInit() {

    // get all id_synthese of the filtered observations:
    this.filteredIds = [];
    for (let id in this.mapListService.tableData) {
      this.filteredIds.push(this.mapListService.tableData[id].id_synthese);
    }
    this.isNextButtonValid = true;
    this.isPrevButtonValid = true;

    // disable nextButton if last observation selected
    if (
      this.filteredIds.indexOf(this.id_synthese) ==
      this.filteredIds.length - 1
    ) {
      this.isNextButtonValid = false;
    } else {
      this.isNextButtonValid = true;
    }

    // disable previousButton if first observation selected
    if (this.filteredIds.indexOf(this.id_synthese) == 0) {
      this.isPrevButtonValid = false;
    } else {
      this.isPrevButtonValid = true;
    }

    this.edit = false;
    this.showEmail = false;
    //MET Load informations releve on initialisation to send to synthese-info-obs.component.html
    this.loadOneSyntheseReleve(this.id_synthese);
  }

  setCurrentCdNomenclature(item) {
    this.currentCdNomenclature = item.cd_nomenclature;
  }

  getStatusNames() {
    this._validatioDataService.getStatusNames().subscribe(
      result => {
        // get status names
        this.validationStatus = result;
        //this.validationStatus[0]
        // order item
        // put "en attente de la validation" at the end
        this.validationStatus.push(this.validationStatus[0]);
        // end remove it
        this.validationStatus.shift();
      },
      err => {
        if (err.statusText === "Unknown Error") {
          // show error message if no connexion
          this._commonService.translateToaster(
            "error",
            "ERROR: IMPOSSIBLE TO CONNECT TO SERVER (check your connection)"
          );
        } else {
          // show error message if other server error
          this._commonService.translateToaster("error", err.error);
        }
      },
      () => {
        this.edit = true;
      }
    );
  }

  loadOneSyntheseReleve(idSynthese) {
    this._syntheseDataService
      .getOneSyntheseObservation(idSynthese)
      .subscribe(data => {
        this.selectedObs = data;
        this.selectedObs["municipalities"] = [];
        this.selectedObs["other_areas"] = [];
        const date_min = new Date(this.selectedObs.date_min);
        this.selectedObs.date_min = date_min.toLocaleDateString("fr-FR");
        const date_max = new Date(this.selectedObs.date_max);
        this.selectedObs["actors"] = this.selectedObs["actors"].split('|');
        this.selectedObs.date_max = date_max.toLocaleDateString("fr-FR");

        const areaDict = {};
        //Si la géométrie est hors du périmètre, ca plante car areas est undefined
          //Passage du formatedAreas en paramètre de pnx-synthese-info-obs, sinon ca marche moins bien
        if(this.selectedObs.areas){
          // for each area type we want all the areas: we build an dict of array
          this.selectedObs.areas.forEach(area => {
            if (!areaDict[area.area_type.type_name]) {
              areaDict[area.area_type.type_name] = [area];
            } else {
              areaDict[area.area_type.type_name].push(area);
            }
          });
        }
        // for angular tempate we need to convert it into a aray
        //premièrement on l'initialise
        this.formatedAreas = [];
        for (let key in areaDict) {
          if(areaDict[key][0].area_type.type_code){
            this.formatedAreas.push({ type_code : areaDict[key][0].area_type.type_code, area_type: key, areas: areaDict[key] });
          }else{
            this.formatedAreas.push({ area_type: key, areas: areaDict[key] });
          }
        }

        this._gnDataService
          .getTaxonAttributsAndMedia(
            data.cd_nom,
            this.SYNTHESE_CONFIG.ID_ATTRIBUT_TAXHUB
          )
          .subscribe(taxAttr => {
            this.selectObsTaxonInfo = taxAttr;
          });

        this._gnDataService.getTaxonInfo(data.cd_nom).subscribe(taxInfo => {
          this.selectedObsTaxonDetail = taxInfo;
          
          if (this.selectedObs.cor_observers) {
            this.mailto = null;
            this.email = this.selectedObs.cor_observers
              .map(el => el.email)
              .join();

            if (this.email.length > 0 ) {
              let d = { ...this.selectedObsTaxonDetail, ...this.selectedObs};
              if (this.selectedObs.source.url_source) {
                d['data_link'] = "Lien vers l'observation : " + [
                  this.APP_CONFIG.URL_APPLICATION,
                  this.selectedObs.source.url_source,
                  this.selectedObs.entity_source_pk_value
                ].join("/");
              }
              else {
                d['data_link'] = "";
              }
              
              let contentCommunes = "";
              this.formatedAreas.map((area) => {
                if(area.type_code == "COM"){
                  area.areas.map((commune) => {
                    contentCommunes += commune.area_name  + ", ";
                  });
                  contentCommunes = contentCommunes.substring(0, contentCommunes.length - 2);
                }
              })
              d["communes"] = contentCommunes;
              
              let contentMedias = "";
              if(!this.selectedObs.medias){
                contentMedias = "Aucun media";
              }else{
                if(this.selectedObs.medias.length == 0){
                  contentMedias = "Aucun media";
                }
                this.selectedObs.medias.map((media) => {
                  contentMedias += "\n\tTitre : " + media.title_fr;
                  contentMedias += "\n\tLien vers le media : " + this.mediaService.href(media);
                  if(media.description_fr){
                    contentMedias += "\n\tDescription : " + media.description_fr;
                  }
                  if(media.author){
                    contentMedias += "\n\tAuteur : " + media.author;
                  }
                  contentMedias += "\n";
                })
              }
              d["medias"] = contentMedias;

              const mail_subject = eval('`' + this.VALIDATION_CONFIG.MAIL_SUBJECT + '`');
              const mail_body = eval('`' + this.VALIDATION_CONFIG.MAIL_BODY + '`');
              let mailto = encodeURI("mailto:" + this.email + "?subject=" + mail_subject+ "&body=" + mail_body)
              mailto = mailto.replace(/,/g, '%2c');
              this.mailto = mailto;
            }
          }
            /*Envoie de mail ici quand tout est chargé */
            /*if (this.selectedObs.cor_observers) {
              this.email = this.selectedObs.cor_observers.map(el => el.email).join();
              this.mailto = String("mailto:" + this.email + "?");
              //1er passage pour la validation, après on passe par ModalInfoObsComponent
              if (this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_INFO_SUJET != ""){
                this.mailto += "subject=" + this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_INFO_SUJET + "&";
              }
              if (this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_INFO_CONTENT != "" && this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_DISPLAY_INFO.length > 0){
                this.mailto += "body=" + this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_INFO_CONTENT ;
                this.mailto += this.contentInfoObservationForMail();
              }
            }*/
        });
      });


  }

  loadValidationHistory(uuid) {
    this._gnDataService.getValidationHistory(uuid).subscribe(
      data => {
        this.validationHistory = data;
        // tslint:disable-next-line:forin
        for (let row in this.validationHistory) {
          // format date
          const date = new Date(this.validationHistory[row].date);
          this.validationHistory[row].date = date.toLocaleDateString("fr-FR");
          // format comments
          if (
            this.validationHistory[row].comment == "None" ||
            this.validationHistory[row].comment == "auto = default value"
          ) {
            this.validationHistory[row].comment = "";
          }
          // format validator
          if (this.validationHistory[row].typeValidation == "True") {
            this.validationHistory[row].validator = "Attribution automatique";
          }
        }
      },
      err => {
        console.log(err);
        if (err.status === 404) {
          this._commonService.translateToaster(
            "warning",
            "Aucun historique de validation"
          );
        } else if (err.statusText === "Unknown Error") {
          // show error message if no connexion
          this._commonService.translateToaster(
            "error",
            "ERROR: IMPOSSIBLE TO CONNECT TO SERVER (check your connection)"
          );
        } else {
          // show error message if other server error
          this._commonService.translateToaster("error", err.error);
        }
      },
      () => {
        //console.log(this.statusNames);
      }
    );
  }


  increaseObs() {
    this.showEmail = false;
    // add 1 to find new position
    this.position = this.filteredIds.indexOf(this.id_synthese) + 1;
    // disable next button if last observation
    if (this.position == this.filteredIds.length - 1) {
      this.isNextButtonValid = false;
    } else {
      this.isNextButtonValid = true;
    }

    // array value (=id_synthese) of the new position
    this.id_synthese = this.filteredIds[
      this.filteredIds.indexOf(this.id_synthese) + 1
    ];
    const syntheseRow = this.mapListService.tableData[this.position]

    this.loadOneSyntheseReleve(syntheseRow.id_synthese);
    this.loadValidationHistory(syntheseRow.unique_id_sinp);
    this.isPrevButtonValid = true;
    this.statusForm.reset();
    this.edit = false;
  }

  decreaseObs() {
    this.showEmail = false;
    // substract 1 to find new position
    this.position = this.filteredIds.indexOf(this.id_synthese) - 1;
    // disable previous button if first observation
    if (this.position == 0) {
      this.isPrevButtonValid = false;
    } else {
      this.isPrevButtonValid = true;
    }

    // array value (=id_synthese) of the new position
    this.id_synthese = this.filteredIds[
      this.filteredIds.indexOf(this.id_synthese) - 1
    ];
    const syntheseRow = this.mapListService.tableData[this.position]

    this.loadOneSyntheseReleve(syntheseRow.id_synthese);
    this.loadValidationHistory(syntheseRow.unique_id_sinp);
    this.isNextButtonValid = true;
    this.statusForm.reset();
    this.edit = false;
  }

  isEmail() {
    this.showEmail = true;
    return this.showEmail;
  }

  closeModal() {
    this.showEmail = false;
    this.activeModal.close();
  }

  backToModule(url_source, id_pk_source) {
    const link = document.createElement("a");
    link.target = "_blank";
    link.href = url_source + "/" + id_pk_source;
    link.setAttribute("visibility", "hidden");
    link.click();
  }

  onSubmit(value) {
    // post validation status form ('statusForm') for the current observation
    return this._validatioDataService
      .postStatus(value, this.id_synthese)
      .toPromise()
      .then(data => {
        /** TODO à virer ? ** this.promiseResult = data as JSON; **/
        //console.log('retour du post : ', this.promiseResult);
        return new Promise((resolve, reject) => {
          // show success message indicating the number of observation(s) with modified validation status
          this._commonService.translateToaster(
            "success",
            "Nouveau statut de validation enregistré"
          );
          this.update_status();
          this.getValidationDate(this.selectedObs.unique_id_sinp);
          this.loadOneSyntheseReleve(this.selectedObs);
          this.loadValidationHistory(this.selectedObs.unique_id_sinp);
          // bind statut value with validation-synthese-list component
          this.statusForm.reset();
          resolve("data updated");
        });
      })
      .catch(err => {
        if (err.statusText === "Unknown Error") {
          // show error message if no connexion
          this._commonService.translateToaster(
            "error",
            "ERROR: IMPOSSIBLE TO CONNECT TO SERVER (check your connection)"
          );
        } else {
          // show error message if other server error
          this._commonService.translateToaster("error", err.error);
        }
        Promise.reject();
      })
      .then(data => {
        //console.log(data);
        return new Promise((resolve, reject) => {
          // close validation status popup
          this.edit = false;
          resolve("process finished");
        });
      })
      .then(data => {
        //console.log(data);
      });
  }

  update_status() {
    // send valstatus value to validation-synthese-list component
    this.modifiedStatus.emit({
      id_synthese: this.id_synthese,
      new_status: this.currentCdNomenclature
    });
  }

  cancel() {
    this.statusForm.reset();
    this.edit = false;
  }

  getValidationDate(uuid) {
    this._validatioDataService.getValidationDate(uuid).subscribe(
      result => {
        // get status names
        this.validationDate = result;
      },
      err => {
        if (err.statusText === "Unknown Error") {
          // show error message if no connexion
          this._commonService.translateToaster(
            "error",
            "ERROR: IMPOSSIBLE TO CONNECT TO SERVER (check your connection)"
          );
        } else {
          // show error message if other server error
          this._commonService.translateToaster("error", err.error);
        }
      },
      () => {
        this.valDate.emit(this.validationDate);
      }
    );
  }
  

  //En fonction des paramètres passés dans la config CONFIG.FRONTEND.DISPLAY_EMAIL_INFO.DISPLAY_INFO,
  //On affichera les informations de l'observation. Pour le moment fait pour 'NOM_VERN', 'DATE', 'COMMUNES', 'MEDIAS'
  /*public contentInfoObservationForMail(){
    if(this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_DISPLAY_INFO.length == 0){
      return;
    }
    let content : string = "\n";
    this.APP_CONFIG.FRONTEND.DISPLAY_EMAIL_DISPLAY_INFO.map((keyToDisplay) => {
      switch(keyToDisplay){
        case "NOM_VERN":
          if(this.selectedObsTaxonDetail.nom_vern){
            content += this.selectedObsTaxonDetail.nom_vern + " - ";
          }
          content += this.selectedObsTaxonDetail.nom_valide;
          break;
          
        case "DATE":
          if(this.selectedObsTaxonDetail.nom_vern){
            content += "\nDate : ";
            if(this.selectedObs.date_min != this.selectedObs.date_max){
              content += this.selectedObs.date_min + " -> " + this.selectedObs.date_max;
            }else{
              content += this.selectedObs.date_min;
            }
          }
          break;
          
        case "COMMUNES":
          this.formatedAreas.map((area) => {
            if(area.type_code == "COM"){
              content += "\nCommune(s) : ";
              area.areas.map((commune) => {
                content += commune.area_name  + ", ";
              });
              content = content.substring(0, content.length - 2);
            }
          })
          break;
          
        case "MEDIAS":
          content += "\nMedias : ";
          if(!this.selectedObs.medias){
            content += "Aucun media";
          }else{
            if(this.selectedObs.medias.length == 0){
              content += "Aucun media";
            }
            this.selectedObs.medias.map((media) => {
              content += "\n\tTitre : " + media.title_fr;
              content += "\n\tLien vers le media : " + this.mediaService.href(media);
              if(media.description_fr){
                content += "\n\tDescription : " + media.description_fr;
              }
              if(media.author){
                content += "\n\tAuteur : " + media.author;
              }
              content += "\n";
            })
          }
          break;
      };
    })
    return encodeURI(content);
  }*/
}
