import { Component, Input, ViewContainerRef, ViewChild, ComponentRef, ComponentFactory, ComponentFactoryResolver } from "@angular/core";
import { FormControl, FormGroup, FormBuilder } from "@angular/forms";
import { OcctaxFormService } from "../occtax-form.service";
import { ModuleConfig } from "../../module.config";
import { AppConfig } from "@geonature_config/app.config";
import { OcctaxFormOccurrenceService } from "../occurrence/occurrence.service";
import { OcctaxFormCountingService } from "./counting.service";
import { dynamicFormReleveComponent } from "../dynamique-form-releve/dynamic-form-releve.component";

@Component({
  selector: "pnx-occtax-form-counting",
  templateUrl: "./counting.component.html",
  styleUrls: ["./counting.component.scss"]
})
export class OcctaxFormCountingComponent {
  @ViewChild("dynamiqueContainerCounting", { read: ViewContainerRef }) public containerCounting: ViewContainerRef;

  public occtaxConfig = ModuleConfig;
  public appConfig = AppConfig;
  
  public dynamicFormGroup: FormGroup;
  public data : any;
  //public dynamicContainerOccurence: ViewContainerRef;
  componentRefOccurence: ComponentRef<any>;

  @Input('form') countingForm: FormGroup;

  constructor(
    public fs: OcctaxFormService,
    public occtaxFormOccurrenceService: OcctaxFormOccurrenceService,
    private occtaxFormCountingService: OcctaxFormCountingService,
    private _resolver: ComponentFactoryResolver,
    private fb: FormBuilder,
  ) { }

  ngOnInit() {
    this.occtaxFormCountingService.dynamicContainerCounting = this.containerCounting;
    
    //Ajout du composant dynamique
    let dynamiqueFormDataset = this.fs.getAddDynamiqueFields(this.occtaxFormOccurrenceService.idDataset);
    if (this.occtaxFormOccurrenceService.idDataset){
      let hasDynamicForm = false;
      if (dynamiqueFormDataset){
        if (dynamiqueFormDataset['COUNTING']){
          hasDynamicForm = true;
        }
      }
      if(hasDynamicForm){
        // Initialisation du formulaire dynamique 
        this.occtaxFormCountingService.dynamicContainerCounting.clear(); 
        const factory: ComponentFactory<any> = this._resolver.resolveComponentFactory(dynamicFormReleveComponent);
        this.occtaxFormCountingService.componentRefCounting = this.occtaxFormCountingService.dynamicContainerCounting.createComponent(factory);
        
        this.dynamicFormGroup = this.fb.group({});
        
        if(this.countingForm.get('additional_fields')){
          for (const key of Object.keys(this.countingForm.get('additional_fields').value)){
            this.dynamicFormGroup.addControl(key, new FormControl(this.countingForm.get('additional_fields').value[key]));
          }
        }

        this.occtaxFormCountingService.componentRefCounting.instance.formConfigReleveDataSet = dynamiqueFormDataset['COUNTING'];
        this.occtaxFormCountingService.componentRefCounting.instance.formArray = this.dynamicFormGroup;
        
        this.countingForm.setControl('additional_fields', this.dynamicFormGroup); 
      }
    }
  }

  taxref() {
    const taxref = this.occtaxFormOccurrenceService.taxref.getValue();
    return taxref;
  }

  defaultsMedia() {
    const occtaxData = this.fs.occtaxData.getValue();
    const taxref = this.occtaxFormOccurrenceService.taxref.getValue();

    if (!(occtaxData && taxref)) {
      return {
        displayDetails: false,
      }
    }

    const observers = (occtaxData && occtaxData.releve.properties.observers) || [];
    const author = observers.map(o => o.nom_complet).join(', ');

    const date_min = (occtaxData && occtaxData.releve.properties.date_min) || null;


    const cd_nom = String(taxref && taxref.cd_nom) || '';
    const lb_nom = (taxref && `${taxref.lb_nom}`) || '';
    const date_txt = date_min ? `${date_min.year}_${date_min.month}_${date_min.day}` : ''
    const date_txt2 = date_min ? `${date_min.day}/${date_min.month}/${date_min.year}` : ''

    return {
      displayDetails: false,
      author: author,
      title_fr: `${date_txt}_${lb_nom.replace(' ', '_')}_${cd_nom}`,
      description_fr: `${lb_nom} observé le ${date_txt2}`,
    }
  }

}
