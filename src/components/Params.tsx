import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import {
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Box,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DeleteForeverSharp, PlusOne } from "@mui/icons-material";
import ParamTableOnForm from "./ParamTableOnForm";

interface ParamFormProps {
  activeNode: any; // Replace 'any' with the appropriate type for activeNode
}

export default function ({ activeNode }: ParamFormProps) {
  const [paramErrors, setParamErrors]: any = useState([]);

  // Backend may return formData with value as array for multi-value params without allowMultipleValues set
  const isMultiValueParam = (param: any) =>
    param.allowMultipleValues === true || Array.isArray(param.value);

  // init formik with values from activeNode
  const initValues = () => {
    // init values using formDataState and setFormDataState
    let initValues: any = {};
    activeNode.data.formData.forEach((obj: any) => {
      if (obj.paramType === "result") {
        obj.value = obj.value !== null ? obj.value : true;
        initValues[obj.id] = obj.value !== null ? obj.value : true;
        obj.resultParamValue = obj.resultParamValue ? obj.resultParamValue : "";
        initValues[`resultParamValue${obj.id}`] = obj.resultParamValue
          ? obj.resultParamValue
          : "";
      } else if (isMultiValueParam(obj)) {
        const arr = Array.isArray(obj.value)
          ? (obj.value.length ? obj.value : [""])
          : [obj.value ?? ""];
        initValues[obj.id] = arr;
      } else {
        initValues[obj.id] = obj.value != null ? obj.value : "";
      }
    });
    // Now a dedicated field in each service (should always accompany other params)
    // initValues[`addinst${activeNode?.data.id}`] = activeNode?.data.additionalInstructions ? activeNode?.data.additionalInstructions : '';

    return initValues;
  };

  // validation function for formik to check for empty fields
  const validate = (values: any) => {
    let errors: any = {};
    activeNode.data.formData.forEach((obj: any) => {
      if (obj.paramType === "result") return;
      const key = obj.id;
      if (isMultiValueParam(obj)) {
        if (obj.required) {
          const arr = values[key];
          const hasValue = Array.isArray(arr) && arr.some((v: any) => v != null && String(v).trim() !== "");
          if (!hasValue) errors[key] = "Required (at least one value)";
        }
      } else {
        if (
          values[key] === "" ||
          values[key] === undefined ||
          values[key] === null
        ) {
          if (obj.required) errors[key] = "Required";
        }
      }
    });
    setParamErrors(errors);
    return errors;
  };

  // copy formik values to activeNode.data
  const copyFormikValuesToNodeData = (values: any) => {
    activeNode.data.formData.forEach((obj: any) => {
      if (obj.paramType === "result") {
        obj.resultParamValue = values[`resultParamValue${obj.id}`];
      }
      obj.value = values[obj.id];
    });
    // Now a dedicated field in each service (should always accompany other params)
    // activeNode.data.additionalInstructions = values[`addinst${activeNode?.data.id}`];
  };

  // formik hook init
  const formik = useFormik({
    initialValues: initValues(),
    enableReinitialize: true,
    validate: validate,
    onSubmit: (values: any) => {
      copyFormikValuesToNodeData(values);
    },
  });

  const returnParamGroups = (activeNodeData: any) => {

    let paramGroups: any[] = [];
    let paramGroupIds = activeNodeData.paramGroups.map((paramGroup: any) => {
      return paramGroup.id;
    });

    // loop through param groups and add parameters to the group
    paramGroupIds.forEach((paramGroupId: any) => {
      let paramGroup = {
        id: paramGroupId,
        name: activeNodeData.paramGroups.find((paramGroup: any) => paramGroup.id === paramGroupId).name,
        parameters: [],
      };
      activeNodeData.formData.forEach((param: any) => {
        if (param.paramGroupId === paramGroupId) {
          paramGroup.parameters.push(param);
        }
      });
      paramGroups.push(paramGroup);
    });

    return paramGroups;
    
  }

  const renderParamGroups = (formData: any) => {

    // render the paramGroups using same structure as the form
    // should render param group name and then the parameters

    let paramGroups = returnParamGroups(formData);

    return (
      <div 
      style={{
        border: "1px solid black",
        padding: 2,
      }}>
        {paramGroups.map((paramGroup: any) => {
          return (
            <div key={paramGroup.id}>
              <h4>{paramGroup.name}</h4>
              <div className="input-params" style={{ marginLeft: 20 }}>
                {paramGroup.parameters.map((param: any) => {
                  if (param.paramType !== "result") {
                    if (param.type === "table") {
                      return (
                        <div key={param.id}>
                          <ParamTableOnForm
                            title={param.name}
                            columns={param.tableData.columns}
                            rows={param.tableData.rows}
                          />
                        </div>
                      );
                    }
                    if (param.type === "dropdown" && isMultiValueParam(param)) {
                      const values = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [""];
                      return (
                        <div key={param.id} style={{ marginTop: 12 }}>
                          <Box display="flex" alignItems="flex-start" gap={0.5} flexWrap="wrap">
                            <Box>
                              {values.map((val: string, idx: number) => (
                                <Box key={idx} display="flex" alignItems="center" gap={0.5} sx={{ mt: idx > 0 ? 1 : 0 }}>
                                  <FormControl size="small" sx={{ width: "26ch" }}>
                                    <InputLabel sx={{ backgroundColor: "white" }}>
                                      {idx === 0 ? param.name : `${param.name} (${idx + 1})`}
                                    </InputLabel>
                                    <Select
                                      value={val ?? ""}
                                      onChange={(e) => {
                                        const next = [...values];
                                        next[idx] = e.target.value;
                                        formik.setFieldValue(param.id, next);
                                      }}
                                      onBlur={formik.handleBlur}
                                    >
                                      {param.options?.map((option: any) => (
                                        <MenuItem key={option.id} value={option.id}>
                                          {option.name}
                                        </MenuItem>
                                      )) ?? []}
                                    </Select>
                                    {idx === 0 && param.description && (
                                      <FormHelperText>{param.description}</FormHelperText>
                                    )}
                                  </FormControl>
                                  {idx > 0 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        const next = values.filter((_: any, i: number) => i !== idx);
                                        formik.setFieldValue(param.id, next.length ? next : [""]);
                                      }}
                                      aria-label="Remove value"
                                    >
                                      <DeleteForeverSharp fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              ))}
                              <IconButton
                                size="small"
                                onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                aria-label="Add another value"
                                sx={{ alignSelf: "flex-start", mt: 0.5 }}
                              >
                                <PlusOne />
                              </IconButton>
                            </Box>
                          </Box>
                        </div>
                      );
                    }
                    if (param.type === "dropdown") {
                      return (
                        <FormControl
                          size="small"
                          sx={{ mt: 3, width: "26ch" }}
                          key={param.id}
                        >
                          {param.dynamicAdd && (
                            <IconButton onClick={() => {
                              // add param to form data
                              const newParam = {
                                id: Math.random().toString(36).substring(2, 9),
                                nodeId: activeNode.data.id,
                                name: param.name,
                                type: param.type,
                                options: param.options,
                                description: param.description,
                                paramType: "input",
                                resultParamValue: "",
                                value: "",
                                required: false,
                                dynamicAdd: false,
                                addedDynamically: true,
                              };
                              // add new param to form data right after the current param
                              const newFormData = activeNode.data.formData;
                              newFormData.splice(
                                newFormData.indexOf(param) + 1,
                                0,
                                newParam
                              );
                              activeNode.data.formData = newFormData;
                              // update formik values
                              formik.setValues(initValues());

                            }}>
                              <PlusOne />
                            </IconButton>
                          )}
                          {
                            // if added dynamically, show delete button
                            param.addedDynamically && (
                              <IconButton onClick={() => {
                                // remove param from form data
                                const newFormData = activeNode.data.formData;
                                newFormData.splice(newFormData.indexOf(param), 1);
                                activeNode.data.formData = newFormData;
                                // update formik values
                                formik.setValues(initValues());
                              }}>
                                <DeleteForeverSharp />
                              </IconButton>
                            )
                          }
                          <InputLabel sx={{ backgroundColor: "white" }}>
                            {param.name}
                          </InputLabel>
                          <Select
                            name={param.id}
                            value={
                              formik.values[param.id] ? formik.values[param.id] : ""
                            }
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                          >
                            {param.options.map((option: any) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            {param.description ? param.description : null}
                          </FormHelperText>
                        </FormControl>
                      );
                    }
                    if (param.type !== "dropdown" && isMultiValueParam(param)) {
                      const values = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [""];
                      return (
                        <div key={param.id} style={{ marginTop: 12 }}>
                          <Box display="flex" alignItems="flex-start" gap={0.5} flexWrap="wrap">
                            <Box>
                              {values.map((val: string, idx: number) => (
                                <Box key={idx} display="flex" alignItems="center" gap={0.5} sx={{ mt: idx > 0 ? 1 : 0 }}>
                                  <TextField
                                    multiline={param.name === "Additional Notes"}
                                    helperText={idx === 0 && param.description ? param.description : null}
                                    size="small"
                                    label={idx === 0 ? param.name : undefined}
                                    type={param.type}
                                    value={val ?? ""}
                                    onChange={(e) => {
                                      const next = [...values];
                                      next[idx] = e.target.value;
                                      formik.setFieldValue(param.id, next);
                                    }}
                                    onBlur={formik.handleBlur}
                                    sx={{ width: "26ch" }}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                  {idx > 0 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        const next = values.filter((_: any, i: number) => i !== idx);
                                        formik.setFieldValue(param.id, next.length ? next : [""]);
                                      }}
                                      aria-label="Remove value"
                                    >
                                      <DeleteForeverSharp fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              ))}
                              <IconButton
                                size="small"
                                onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                aria-label="Add another value"
                                sx={{ alignSelf: "flex-start", mt: 0.5 }}
                              >
                                <PlusOne />
                              </IconButton>
                            </Box>
                          </Box>
                        </div>
                      );
                    }
                    else {
                      return (
                        <div key={param.id}>
                          {param.dynamicAdd && (
                            <IconButton onClick={() => alert("Dynamic Add")}>
                              <InfoOutlinedIcon />
                            </IconButton>
                          )}
                          <TextField
                            multiline={
                              param.name === "Additional Notes" ? true : false
                            }
                            helperText={param.description ? param.description : null}
                            size="small"
                            label={param.name}
                            type={param.type}
                            value={
                              formik.values[param.id] ? formik.values[param.id] : ""
                            }
                            name={param.id}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            sx={{ mt: 3, width: "26ch" }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </div>
                      );
                    }
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    );

  }

  // update values to active node form data and validate
  useEffect(() => {
    copyFormikValuesToNodeData(formik.values);
    const errors = validate(formik.values);
    if (Object.keys(errors).length > 0) {
      formik.setErrors(errors);
    }
    if (Object(errors).length !== paramErrors.length) {
      setParamErrors(errors);
    }
  }, [formik.values]);


  return (
    <div>
      <h3>Parameters</h3>
      <div className="formik-errors" style={{ marginLeft: 20 }}>
        <ul style={{ background: "pink", fontSize: 10 }}>
          {Object.keys(paramErrors).map((key: any) => {
            let name = activeNode.data.formData.find(
              (obj: any) => obj.id === key
            )?.name;
            return (
              <li key={key} style={{ position: "relative", left: -25 }}>
                {name}: {paramErrors[key]}
              </li>
            );
          })}
        </ul>
      </div>
      <form onSubmit={formik.handleSubmit}>
        {
          // check if there are any param groups and render them
          activeNode.data.paramGroups &&
          renderParamGroups(activeNode.data)
        }
        <div className="input-params" style={{ marginLeft: 20 }}>
          {activeNode.data.formData.map((param: any) => {
            if (param.paramType !== "result" && !param.paramGroupId) {
              if (param.type === "table") {
                return (
                  <div key={param.id}>
                    <ParamTableOnForm
                      title={param.name}
                      columns={param.tableData.columns}
                      rows={param.tableData.rows}
                    />
                  </div>
                );
              }
              if (param.type === "dropdown" && !isMultiValueParam(param)) {
                return (
                  <FormControl
                    size="small"
                    sx={{ mt: 3, width: "26ch" }}
                    key={param.id}
                  >
                    {param.dynamicAdd && (
                      <IconButton onClick={() => {
                        // add param to form data
                        const newParam = {
                          id: Math.random().toString(36).substring(2, 9),
                          nodeId: activeNode.data.id,
                          name: param.name,
                          type: param.type,
                          options: param.options,
                          description: param.description,
                          paramType: "input",
                          resultParamValue: "",
                          value: "",
                          required: false,
                          dynamicAdd: false,
                          addedDynamically: true,
                        };
                        // add new param to form data right after the current param
                        const newFormData = activeNode.data.formData;
                        newFormData.splice(
                          newFormData.indexOf(param) + 1,
                          0,
                          newParam
                        );
                        activeNode.data.formData = newFormData;
                        // update formik values
                        formik.setValues(initValues());

                      }}>
                        <PlusOne />
                      </IconButton>
                    )}
                    {
                        // if added dynamically, show delete button
                        param.addedDynamically && (
                            <IconButton onClick={() => {
                                // remove param from form data
                                const newFormData = activeNode.data.formData;
                                newFormData.splice(newFormData.indexOf(param), 1);
                                activeNode.data.formData = newFormData;
                                // update formik values
                                formik.setValues(initValues());
                            }}>
                                <DeleteForeverSharp />
                            </IconButton>
                        )
                    }
                    <InputLabel sx={{ backgroundColor: "white" }}>
                      {param.name}
                    </InputLabel>
                    <Select
                      name={param.id}
                      value={
                        formik.values[param.id] ? formik.values[param.id] : ""
                      }
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      {param.options.map((option: any) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {param.description ? param.description : null}
                    </FormHelperText>
                  </FormControl>
                );
              }
              if (param.type === "dropdown" && isMultiValueParam(param)) {
                const values = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [""];
                return (
                  <div key={param.id} style={{ marginTop: 12 }}>
                    <Box display="flex" alignItems="flex-start" gap={0.5} flexWrap="wrap">
                      <Box>
                        {values.map((val: string, idx: number) => (
                          <Box key={idx} display="flex" alignItems="center" gap={0.5} sx={{ mt: idx > 0 ? 1 : 0 }}>
                            <FormControl size="small" sx={{ width: "26ch" }}>
                              <InputLabel sx={{ backgroundColor: "white" }}>
                                {idx === 0 ? param.name : `${param.name} (${idx + 1})`}
                              </InputLabel>
                              <Select
                                value={val ?? ""}
                                onChange={(e) => {
                                  const next = [...values];
                                  next[idx] = e.target.value;
                                  formik.setFieldValue(param.id, next);
                                }}
                                onBlur={formik.handleBlur}
                              >
                                {param.options?.map((option: any) => (
                                  <MenuItem key={option.id} value={option.id}>
                                    {option.name}
                                  </MenuItem>
                                )) ?? []}
                              </Select>
                              {idx === 0 && param.description && (
                                <FormHelperText>{param.description}</FormHelperText>
                              )}
                            </FormControl>
                            {idx > 0 && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const next = values.filter((_: any, i: number) => i !== idx);
                                  formik.setFieldValue(param.id, next.length ? next : [""]);
                                }}
                                aria-label="Remove value"
                              >
                                <DeleteForeverSharp fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <IconButton
                          size="small"
                          onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                          aria-label="Add another value"
                          sx={{ alignSelf: "flex-start", mt: 0.5 }}
                        >
                          <PlusOne />
                        </IconButton>
                      </Box>
                    </Box>
                  </div>
                );
              }
              if (param.type !== "dropdown" && isMultiValueParam(param)) {
                const values = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [""];
                return (
                  <div key={param.id} style={{ marginTop: 12 }}>
                    <Box display="flex" alignItems="flex-start" gap={0.5} flexWrap="wrap">
                      <Box>
                        {values.map((val: string, idx: number) => (
                          <Box key={idx} display="flex" alignItems="center" gap={0.5} sx={{ mt: idx > 0 ? 1 : 0 }}>
                            <TextField
                              multiline={param.name === "Additional Notes"}
                              helperText={idx === 0 && param.description ? param.description : null}
                              size="small"
                              label={idx === 0 ? param.name : undefined}
                              type={param.type}
                              value={val ?? ""}
                              onChange={(e) => {
                                const next = [...values];
                                next[idx] = e.target.value;
                                formik.setFieldValue(param.id, next);
                              }}
                              onBlur={formik.handleBlur}
                              sx={{ width: "26ch" }}
                              InputLabelProps={{ shrink: true }}
                            />
                            {idx > 0 && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const next = values.filter((_: any, i: number) => i !== idx);
                                  formik.setFieldValue(param.id, next.length ? next : [""]);
                                }}
                                aria-label="Remove value"
                              >
                                <DeleteForeverSharp fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <IconButton
                          size="small"
                          onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                          aria-label="Add another value"
                          sx={{ alignSelf: "flex-start", mt: 0.5 }}
                        >
                          <PlusOne />
                        </IconButton>
                      </Box>
                    </Box>
                  </div>
                );
              }
              return (
                  <div key={param.id}>
                    {param.dynamicAdd && (
                      <IconButton onClick={() => alert("Dynamic Add")}>
                        <InfoOutlinedIcon />
                      </IconButton>
                    )}
                    <TextField
                      multiline={
                        param.name === "Additional Notes" ? true : false
                      }
                      helperText={param.description ? param.description : null}
                      size="small"
                      label={param.name}
                      type={param.type}
                      value={
                        formik.values[param.id] ? formik.values[param.id] : ""
                      }
                      name={param.id}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      sx={{ mt: 3, width: "26ch" }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                );
            } else {
              return null;
            }
          })}
        </div>
        <div className="result-parms" style={{ marginLeft: 20 }}>
          {
            // check if there are any result params and display info if there are
            activeNode.data.formData.find(
              (obj: any) => obj.paramType === "result"
            ) && (
              <div>
                Result Parameters
                <IconButton
                  onClick={() => {
                    alert(
                      "Result parameteres are results of experiments that were previously run in the workflow. By default we will use their outputs, if you would like to specify a different input, you can deselect and enter what we should use."
                    );
                  }}
                >
                  <InfoOutlinedIcon />
                </IconButton>
              </div>
            )
          }
          {activeNode.data.formData.map((param: any) => {
            if (param.paramType === "result") {
              return (
                <div key={param.id}>
                  <label>{param.name}</label>
                  <input
                    type="checkbox"
                    checked={formik.values[param.id]}
                    onChange={formik.handleChange}
                    name={param.id}
                  />
                  {
                    // add input if not checked
                    !formik.values[param.id] && (
                      <div>
                        <label>Result Alternative</label>
                        <input
                          type={param.type}
                          value={
                            formik.values[`resultParamValue${param.id}`]
                              ? formik.values[`resultParamValue${param.id}`]
                              : null
                          }
                          name={`resultParamValue${param.id}`}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                    )
                  }
                </div>
              );
            } else {
              return null;
            }
          })}
        </div>
        {/* Now a dedicated field in each service (should always accompany other params) */}
        {/* <div className="add-instructs" style={{marginLeft: 20, marginBottom: 10}}>
                    <TextField multiline sx={{ mt: 3, width: '26ch' }} label="Additional Instructions" rows={3}
                    value={formik.values[`addinst${activeNode?.data.id}`] 
                         ? formik.values[`addinst${activeNode?.data.id}`] 
                         : ""} 
                    name     = {`addinst${activeNode?.data.id}`}
                    onChange = {formik.handleChange}
                    onBlur   = {formik.handleBlur} />
                </div> */}
      </form>
    </div>
  );
}
