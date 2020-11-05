import { 
    DataType, utils as dataUtils, 
    MetaEntityAttr, DataRow, MetaEditorTag, 
    MetaValueEditor, EntityAttrKind, EasyDataTable 
} from '@easydata/core';

import { 
    browserUtils, DefaultDialogService, 
    domel, DomElementBuilder, EasyGrid,
    DefaultDateTimePicker
} from '@easydata/ui';

import { EasyDataContext } from '../main/easy_data_context';

import { ValidationResult, Validator } from '../validators/validator';
import { TextFilterWidget } from './text_filter_widget';

export type FormBuildParams = { 
    values?: DataRow, 
    isEditForm?: boolean;
};

const isIE = browserUtils.IsIE();

export class EasyForm {

    private errorsDiv: HTMLElement;

    private constructor(private context: EasyDataContext, private html: HTMLElement){
        this.errorsDiv = html.querySelector('.errors-block');
    }

    private validators: Validator[] = [];

    public getHtml() {
        return this.html;
    }

    public validate(): boolean {

        this.clearErrors();

        const inputs = Array.from(this.html.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'));
        let isValid = true;
        for(const input of inputs) {
            const attr = this.context.getMetaData().getAttributeById(input.name);

            if (input.type === 'checkbox')
                continue;

            const result = this.validateValue(attr, input.value);
            if (!result.successed) {
                if (isValid) {
                    domel(this.errorsDiv)
                        .addChild('ul');
                }

                isValid = false;

                for(const message of result.messages) {
                    this.errorsDiv.firstElementChild.innerHTML += `<li>${attr.caption}: ${message}</li>`;
                }
            }
            
            this.markInputValid(input, result.successed);
        }

        return isValid;
    }

    public getData() {
        const inputs = Array.from(this.html
            .querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'));
        let obj = {};
        for(const input of inputs) {
            const property = input.name.substring(input.name.lastIndexOf('.') + 1);
            const attr = this.context.getMetaData().getAttributeById(input.name);

            obj[property] =  input.type !== 'checkbox'
                ? this.mapValue(attr.dataType, input.value)
                : (input as HTMLInputElement).checked          
        }

        return obj;
    }

    public useValidator(...validator: Validator[]) {
        this.useValidators(validator);
    }

    public useValidators(validators: Validator[]) {
        this.validators = this.validators.concat(validators);
    }

    private mapValue(type: DataType, value: string) {

        if (dataUtils.getDateDataTypes().indexOf(type) >= 0) 
            return new Date(value);

        if (dataUtils.isIntType(type))
            return Number.parseInt(value);

        if (dataUtils.isNumericType(type))
            return Number.parseFloat(value);

        return value;
    }

    private clearErrors() {
        this.errorsDiv.innerHTML = '';

        this.html.querySelectorAll('input, select').forEach(el => {
            el.classList.remove('is-valid');
            el.classList.remove('is-invalid');
        });
    }

    private markInputValid(input: HTMLElement, valid: boolean) {
        input.classList.add(valid ? 'is-valid' : 'is-invalid');
    }

    private validateValue(attr: MetaEntityAttr, value: any): ValidationResult {
        const result = { successed: true, messages: []}
        for(const validator of this.validators) {
            const res = validator.validate(attr, value);
            if (!res.successed) {
                result.successed = false;
                result.messages = result.messages.concat(res.messages);
            }
        }

        return result;
    }

    public static build(context: EasyDataContext, params?: FormBuildParams): EasyForm {
            params = params || {};
            let fb: DomElementBuilder<HTMLDivElement>;
            const formHtml =
             domel('div')
                .addClass('kfrm-form')
                .addChild('div', b => b
                    .addClass(`errors-block`)
                    .toDOM()
                )
                .addChild('div', b => {
                    b.addClass(`${isIE 
                        ? 'kfrm-fields-ie col-ie-1-4 label-align-right' 
                        : 'kfrm-fields col-a-1 label-align-right'}`);
     
                    fb = b;
                })
                .toDOM();
    
            if (isIE) {
                fb = domel('div', fb.toDOM())
                    .addClass('kfrm-field-ie');
            }
    
            const getInputType = (dataType: DataType): string => {
                if (dataType == DataType.Bool) {
                    return 'checkbox';
                }
        
                return 'text';
            }
    
            const getEditor = (attr: MetaEntityAttr): MetaValueEditor => {
                return attr.defaultEditor || new MetaValueEditor();
            }
    
            const addFormField = (parent: HTMLElement, attr: MetaEntityAttr) => {
                let value = params.values && attr.kind !== EntityAttrKind.Lookup
                    ? params.values.getValue(attr.id)
                    : undefined;
    
                const editor = getEditor(attr);
                if (editor.tag == MetaEditorTag.Unknown) {
                    if (dataUtils.getDateDataTypes().indexOf(attr.dataType) >= 0) {
                        editor.tag = MetaEditorTag.DateTime;
                    }
                    else {
                        editor.tag = MetaEditorTag.Edit;  
                    }
                }

                let readOnly = params.isEditForm && (attr.isPrimaryKey || !attr.isEditable);
                const required = !attr.isNullable;
                domel(parent)
                    .addChild('label', b => b
                        .attr('for', attr.id)
                        .addHtml(`${attr.caption} ${required ? '<sup style="color: red">*</sup>': ''}: `)
                );
    
                if (attr.kind === EntityAttrKind.Lookup) {
                    const lookupEntity = context.getMetaData().getRootEntity()
                        .subEntities.filter(ent => ent.id == attr.lookupEntity)[0]; 
                    const dataAttr = context.getMetaData().getAttributeById(attr.dataAttr);
    
                    readOnly = readOnly && dataAttr.isEditable;

                    value = params.values 
                        ? params.values.getValue(dataAttr.id)
                        : undefined;
    
                    const horizClass = isIE 
                        ? 'kfrm-fields-ie is-horizontal' 
                        : 'kfrm-fields is-horizontal';

                    let inputEl: HTMLInputElement;
                    domel(parent)
                    .addChild('div', b => { b
                        .addClass(horizClass)
                        .addChild('input', b => { 
                            inputEl = b.toDOM(); 
                            b.attr('readonly', '');

                            b.name(dataAttr.id)
                            b.type(getInputType(dataAttr.dataType));
            
                            b.value(dataUtils.IsDefinedAndNotNull(value)
                                    ? value.toString() : '');     
                        });

                        if (!readOnly)
                            b.addChild('button', b => b
                                .addClass('kfrm-button')
                                .attr('title', 'Navigation values')
                                .addText('...')
                                .on('click', (ev) => {
                            
                                    const lookupTable = new EasyDataTable({
                                        loader: {
                                            loadChunk: (chunkParams) => context.getDataLoader()
                                                .loadChunk({ ... chunkParams, id: lookupEntity.id } as any)
                                        } 
                                    });
            
                                    context.getDataLoader()
                                    .loadChunk({ offset: 0, limit: 1000, needTotal: true, entityId: lookupEntity.id } as any)
                                    .then(data => {
        
                                        for(const col of data.table.columns.getItems()) {
                                            lookupTable.columns.add(col);
                                        }
                        
                                        lookupTable.setTotal(data.total);
                        
                                        for(const row of data.table.getCachedRows()) {
                                            lookupTable.addRow(row);
                                        }
        
                                        const ds = new DefaultDialogService();
                                        let gridSlot: HTMLElement = null;
        
                                        let labelEl: HTMLElement = null;

                                        let widgetSlot: HTMLElement;
                                        const slot = domel('div')
                                            .addClass(`kfrm-form`)
         
                                            .addChild('div', b => b
                                                .addClass(`kfrm-field`)
                                                .addChild('label', b => labelEl = b
                                                    .toDOM()
                                                )
                                            )  
                                            .addChild('div', b => widgetSlot = b.toDOM())   
                                            .addChild('div', b => b
                                                .addClass('kfrm-control')
                                                .addChild('div', b => gridSlot = b.toDOM())
                                            )
                                            .toDOM();
                
                                        let selectedValue = inputEl.value;
        
                                        const updateLabel = () => 
                                            labelEl.innerHTML = `Selected value: '${selectedValue}'`;
                                        updateLabel();
        
                                        const lookupGrid = new EasyGrid({
                                            slot: gridSlot,
                                            dataTable: lookupTable,
                                            paging: {
                                                pageSize: 10
                                            },
                                            onRowDbClick: (ev) => {
                                                const row = ev.row;
                                                selectedValue = row.getValue(attr.lookupDataAttr);
                                                updateLabel();
                                            }
                                        });

                                        const dataFilter = context.createFilter(lookupEntity.id, lookupGrid.getData());

                                        new TextFilterWidget(widgetSlot, lookupGrid, dataFilter, { instantMode: true });
                                        
                                        ds.open({
                                            title: `Select ${lookupEntity.caption}`,
                                            body: slot,
                                            onSubmit: () => {
                                                inputEl.value = selectedValue;
                                                return true;
                                            },
                                            onDestroy: () => {
                                                lookupGrid.destroy();
                                            }
                                        });
                                    });
                                })
                            );
                        });
                    return;
                }
    
                switch (editor.tag) {
                    case MetaEditorTag.DateTime:
                        domel(parent)
                         .addChild('input', b => { 
    
                            if (readOnly)
                                b.attr('readonly', '');

                            b.name(attr.id)
                            b.value(dataUtils.IsDefinedAndNotNull(value) 
                                ? new Date(value).toUTCString() 
                                : '');
    
                            if (!readOnly)
                                b.on('focus', (ev) => {
                                    const inputEl = ev.target as HTMLInputElement;
                                    const oldValue = inputEl.value ? new Date(inputEl.value) : new Date();
                                    const pickerOptions = {
                                        showCalendar: attr.dataType !== DataType.Time,
                                        showTimePicker: attr.dataType !== DataType.Date,
                                        onApply: (dateTime: Date) => {
                                            inputEl.value = dateTime.toUTCString();
                                        },
                                        onCancel: () => {
                                            inputEl.value = oldValue.toUTCString();
                                        },
                                        onDateTimeChanged: (dateTime: Date) => {
                                            inputEl.value = dateTime.toUTCString();
                                        }
                                    };

                                    const dtp = new DefaultDateTimePicker(pickerOptions);
                                    dtp.setDateTime(oldValue);
                                    dtp.show(inputEl);
                                });
                         });
                        break;
    
                    case MetaEditorTag.List:
                        domel(parent)
                            .addChild('select', b => {
                                if (readOnly)
                                    b.attr('readonly', '');
                                b
                                .attr('name', attr.id)
                                
                                if (editor.values) {
                                    for(let i = 0 ; i < editor.values.length; i++) {
                                        b.addOption({
                                            value: value.id,
                                            title: value.text,
                                            selected: i === 0
                                        });
                                    }
                                }
                            });
    
                    case MetaEditorTag.Edit:
                        default:
                            domel(parent)
                                .addChild('input', b => {
                                    if (readOnly)
                                        b.attr('readonly', '');

                                    b
                                        .name(attr.id)
                                        .type(getInputType(attr.dataType));
        
                                    if (value) {
                                        if (attr.dataType == DataType.Bool)
                                            b.attr('checked', '');
                                        else
                                            b.value(dataUtils.IsDefinedAndNotNull(value) 
                                                ? value.toString() 
                                                : '');
                                    }
                                });
                            break;
                }
                
            }
    
        for(const attr of context.getActiveEntity().attributes) {
            if (attr.isForeignKey)
                continue;

            addFormField(fb.toDOM(), attr)
        }

        return new EasyForm(context, formHtml)
    }
}
