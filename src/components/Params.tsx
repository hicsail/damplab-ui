import React, { useEffect } from 'react';
import { useFormik, } from 'formik';

interface ParamFormProps {
    activeNode: any; // Replace 'any' with the appropriate type for activeNode
}

export default function ({ activeNode }: ParamFormProps) {

    const initValues = () => {
        // init values using formDataState and setFormDataState
        let initValues: any = {};
        activeNode.data.formData.forEach((obj: any) => {
            if (obj.paramType === 'result') {
                obj.value = obj.value ? obj.value : true;
                initValues[obj.id] = obj.value ? obj.value : true;
                obj.resultParamValue = obj.resultParamValue ? obj.resultParamValue : '';
                initValues[`resultParamValue${obj.id}`] = obj.resultParamValue ? obj.resultParamValue : '';
            }
            else initValues[obj.id] = obj.value ? obj.value : '';
        });
        initValues[`addinst${activeNode?.data.id}`] = activeNode?.data.additionalInstructions ? activeNode?.data.additionalInstructions : '';
        return initValues;
    }

    const validate = (values: any) => {

        let errors: any = {};
        // loop over values and check if they are empty
        for (let key in values) {
            if ((values[key] === '' || values[key] === undefined || values[key] === null)) {
                // if key is an id of a param in formdata, then it is a required field
                if (activeNode.data.formData.find((obj: any) => obj.id === key)) errors[key] = 'Required';
            }
        }
        return errors;
    };

    const copyFormikValuesToNodeData = (values: any) => {

        activeNode.data.formData.forEach((obj: any) => {
            obj.value = values[obj.id];
            if (obj.paramType === 'result') {
                obj.resultParamValue = values[`resultParamValue${obj.id}`];
            }
        });
        activeNode.data.additionalInstructions = values[`addinst${activeNode?.data.id}`];
    }

    const formik = useFormik({
        initialValues: initValues(),
        enableReinitialize: true,
        validate: validate,
        onSubmit: (values: any) => {
            copyFormikValuesToNodeData(values);
        },
    });

    useEffect(() => {
        copyFormikValuesToNodeData(formik.values);
        const errors = validate(formik.values);
        if (Object.keys(errors).length > 0) {
            formik.setErrors(errors);
        }
    }, [formik.values]);

    return (
        <div>
            <h1>
                {activeNode.data.name}
            </h1>
            <h2>
                Parameters
            </h2>
            <div>
                <div className='formik-errors'>
                    <ul style={{ background: 'pink', fontSize: 10 }}>
                        {
                            Object.keys(formik.errors).map((key: any) => {
                                let name = activeNode.data.formData.find((obj: any) => obj.id === key)?.name;
                                console.log(name)
                                return (
                                    <li key={key}>
                                        {name}: {formik.errors[key]}
                                    </li>
                                )
                            })
                        }
                    </ul>
                </div>
                <form onSubmit={formik.handleSubmit}>
                    <div className='input-params'>
                        {
                            activeNode.data.formData.map((param: any) => {
                                if (param.paramType !== 'result') {
                                    return (
                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <input type={param.paramType} value={formik.values[param.id] ? formik.values[param.id] : ""} name={param.id} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                        </div>
                                    )
                                }
                            })
                        }
                    </div>
                    <div className="result-parms">
                        {
                            activeNode.data.formData.map((param: any) => {
                                if (param.paramType === 'result') {
                                    return (

                                        <div key={param.id}>
                                            <label>
                                                {param.name}
                                            </label>
                                            <input
                                                type="checkbox"
                                                checked={formik.values[param.id]}
                                                onChange={formik.handleChange}
                                                name={param.id}
                                            />
                                            {
                                                // add input if not checked
                                                !formik.values[param.id] &&
                                                <div>
                                                    <label>
                                                        Result Alternative
                                                    </label>
                                                    <input type={param.paramType} value={formik.values[`resultParamValue${param.id}`] ? formik.values[`resultParamValue${param.id}`] : ""} name={`resultParamValue${param.id}`} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                                                </div>
                                            }
                                        </div>
                                    )
                                }
                            })
                        }
                    </div>
                    <div className="add-instructs">
                        <label htmlFor="add">Additional Instructions</label>
                        <textarea value={formik.values[`addinst${activeNode?.data.id}`] ? formik.values[`addinst${activeNode?.data.id}`] : ""} name={`addinst${activeNode?.data.id}`} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                    </div>
                </form>
            </div>

        </div>
    )
}
