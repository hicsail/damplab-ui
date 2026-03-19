import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Chip,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Box,
  Button,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DeleteForeverSharp, PlusOne } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ParamTableOnForm from "./ParamTableOnForm";

interface ParamFormProps {
  activeNode: any; // Replace 'any' with the appropriate type for activeNode
  onFormDataChange?: () => void;
}

type PendingParamFile = {
  __kind: "pending-file";
  localId: string;
  file: File;
  filename: string;
  contentType: string;
  size: number;
};

const isPendingParamFile = (value: unknown): value is PendingParamFile =>
  !!value &&
  typeof value === "object" &&
  (value as PendingParamFile).__kind === "pending-file" &&
  typeof (value as PendingParamFile).filename === "string";

export default function ({ activeNode, onFormDataChange }: ParamFormProps) {
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
        if (obj.type === "file") {
          const arr = Array.isArray(obj.value) ? obj.value : obj.value ? [obj.value] : [];
          initValues[obj.id] = arr;
          return;
        }
        const arr = Array.isArray(obj.value)
          ? (obj.value.length ? obj.value : [""])
          : [obj.value ?? ""];
        initValues[obj.id] = arr;
      } else {
        if (obj.type === "file") {
          initValues[obj.id] = obj.value ?? null;
          return;
        }
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
          const hasValue = obj.type === "file"
            ? Array.isArray(arr) && arr.length > 0
            : Array.isArray(arr) && arr.some((v: any) => v != null && String(v).trim() !== "");
          if (!hasValue) errors[key] = "Required (at least one value)";
        }
      } else {
        if (obj.type === "file") {
          if (obj.required && !values[key]) errors[key] = "Required";
          return;
        }
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

  const toPendingFiles = (files: FileList | null): PendingParamFile[] => {
    if (!files) return [];
    return Array.from(files).map((file) => ({
      __kind: "pending-file",
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    }));
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
      <Stack spacing={1.5}>
        {paramGroups.map((paramGroup: any) => {
          const requiredCount = paramGroup.parameters.filter((p: any) => p.required && p.paramType !== "result").length;
          const missingRequiredCount = paramGroup.parameters.filter(
            (p: any) => p.required && p.paramType !== "result" && !!paramErrors[p.id]
          ).length;

          return (
            <Accordion key={paramGroup.id} defaultExpanded={missingRequiredCount > 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                  <Typography variant="subtitle2">{paramGroup.name}</Typography>
                  {requiredCount > 0 ? <Chip size="small" label={`${requiredCount} required`} /> : null}
                  {missingRequiredCount > 0 ? (
                    <Chip size="small" color="warning" label={`${missingRequiredCount} missing`} />
                  ) : null}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
              <div className="input-params" style={{ marginLeft: 8 }}>
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
                                  {idx === 0 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                      aria-label="Add another value"
                                      sx={{ p: 0.25, ml: 0.25 }}
                                    >
                                      <PlusOne fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              ))}
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
                    if (param.type === "file") {
                      if (isMultiValueParam(param)) {
                        const files = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [];
                        return (
                          <div key={param.id} style={{ marginTop: 12 }}>
                            <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none" }}>
                              {param.name}
                              <input
                                hidden
                                type="file"
                                multiple
                                onChange={(e) => {
                                  const selected = toPendingFiles(e.target.files);
                                  formik.setFieldValue(param.id, [...files, ...selected]);
                                  e.currentTarget.value = "";
                                }}
                              />
                            </Button>
                            {param.description ? (
                              <FormHelperText>{param.description}</FormHelperText>
                            ) : null}
                            <Box sx={{ mt: 1 }}>
                              {files.map((f: any, idx: number) => (
                                <Box key={f?.localId ?? idx} display="flex" alignItems="center" gap={0.5}>
                                  <FormHelperText sx={{ m: 0 }}>
                                    {isPendingParamFile(f) ? f.filename : "Uploaded file"}
                                  </FormHelperText>
                                  <IconButton
                                    size="small"
                                    onClick={() => formik.setFieldValue(param.id, files.filter((_: any, i: number) => i !== idx))}
                                    aria-label="Remove file"
                                  >
                                    <DeleteForeverSharp fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                          </div>
                        );
                      }
                      const fileValue = formik.values[param.id];
                      return (
                        <div key={param.id} style={{ marginTop: 12 }}>
                          <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none" }}>
                            {param.name}
                            <input
                              hidden
                              type="file"
                              onChange={(e) => {
                                const selected = toPendingFiles(e.target.files);
                                formik.setFieldValue(param.id, selected[0] ?? null);
                                e.currentTarget.value = "";
                              }}
                            />
                          </Button>
                          {param.description ? (
                            <FormHelperText>{param.description}</FormHelperText>
                          ) : null}
                          {fileValue ? (
                            <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                              <FormHelperText sx={{ m: 0 }}>
                                {isPendingParamFile(fileValue) ? fileValue.filename : "Uploaded file"}
                              </FormHelperText>
                              <IconButton size="small" onClick={() => formik.setFieldValue(param.id, null)} aria-label="Remove file">
                                <DeleteForeverSharp fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : null}
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
                                  {idx === 0 && (
                                    <IconButton
                                      size="small"
                                      onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                      aria-label="Add another value"
                                      sx={{ p: 0.25, ml: 0.25 }}
                                    >
                                      <PlusOne fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              ))}
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
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
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
    onFormDataChange?.();
  }, [formik.values]);


  return (
    <div>
      <Stack spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6">Parameters</Typography>
        <Typography variant="caption" color="text.secondary">
          Fill required fields first. Optional fields can be updated anytime before checkout.
        </Typography>
        {Object.keys(paramErrors).length > 0 ? (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {Object.keys(paramErrors).length} required field(s) still need values.
            </Typography>
            <Box component="ul" sx={{ my: 0.5, pl: 2 }}>
              {Object.keys(paramErrors).slice(0, 6).map((key: any) => {
                let name = activeNode.data.formData.find((obj: any) => obj.id === key)?.name;
                return (
                  <li key={key}>
                    <Typography variant="caption">
                      {name}: {paramErrors[key]}
                    </Typography>
                  </li>
                );
              })}
              {Object.keys(paramErrors).length > 6 ? (
                <Typography variant="caption">...and more</Typography>
              ) : null}
            </Box>
          </Alert>
        ) : (
          <Alert severity="success" sx={{ py: 0.5 }}>
            <Typography variant="body2">All required fields are complete.</Typography>
          </Alert>
        )}
      </Stack>
      <form onSubmit={formik.handleSubmit}>
        {
          // check if there are any param groups and render them
          activeNode.data.paramGroups &&
          renderParamGroups(activeNode.data)
        }
        <Accordion defaultExpanded sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">General Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
        <div className="input-params" style={{ marginLeft: 8 }}>
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
                      error={Boolean(formik.errors[param.id])}
                    >
                      {param.options.map((option: any) => (
                        <MenuItem key={option.id} value={option.id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {formik.errors[param.id]
                        ? String(formik.errors[param.id])
                        : (param.description ? param.description : null)}
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
                            {idx === 0 && (
                              <IconButton
                                size="small"
                                onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                aria-label="Add another value"
                                sx={{ p: 0.25, ml: 0.25 }}
                              >
                                <PlusOne fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </div>
                );
              }
              if (param.type === "file") {
                if (isMultiValueParam(param)) {
                  const files = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [];
                  return (
                    <div key={param.id} style={{ marginTop: 12 }}>
                      <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none" }}>
                        {param.name}
                        <input
                          hidden
                          type="file"
                          multiple
                          onChange={(e) => {
                            const selected = toPendingFiles(e.target.files);
                            formik.setFieldValue(param.id, [...files, ...selected]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </Button>
                      {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}
                      <Box sx={{ mt: 1 }}>
                        {files.map((f: any, idx: number) => (
                          <Box key={f?.localId ?? idx} display="flex" alignItems="center" gap={0.5}>
                            <FormHelperText sx={{ m: 0 }}>
                              {isPendingParamFile(f) ? f.filename : "Uploaded file"}
                            </FormHelperText>
                            <IconButton
                              size="small"
                              onClick={() => formik.setFieldValue(param.id, files.filter((_: any, i: number) => i !== idx))}
                              aria-label="Remove file"
                            >
                              <DeleteForeverSharp fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </div>
                  );
                }
                const fileValue = formik.values[param.id];
                return (
                  <div key={param.id} style={{ marginTop: 12 }}>
                    <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none" }}>
                      {param.name}
                      <input
                        hidden
                        type="file"
                        onChange={(e) => {
                          const selected = toPendingFiles(e.target.files);
                          formik.setFieldValue(param.id, selected[0] ?? null);
                          e.currentTarget.value = "";
                        }}
                      />
                    </Button>
                    {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}
                    {fileValue ? (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                        <FormHelperText sx={{ m: 0 }}>
                          {isPendingParamFile(fileValue) ? fileValue.filename : "Uploaded file"}
                        </FormHelperText>
                        <IconButton size="small" onClick={() => formik.setFieldValue(param.id, null)} aria-label="Remove file">
                          <DeleteForeverSharp fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : null}
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
                            {idx === 0 && (
                              <IconButton
                                size="small"
                                onClick={() => formik.setFieldValue(param.id, [...values, ""])}
                                aria-label="Add another value"
                                sx={{ p: 0.25, ml: 0.25 }}
                              >
                                <PlusOne fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
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
                      error={Boolean(formik.errors[param.id])}
                      helperText={formik.errors[param.id] ? String(formik.errors[param.id]) : (param.description ? param.description : null)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>
                );
            } else {
              return null;
            }
          })}
        </div>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Result Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
        <div className="result-parms" style={{ marginLeft: 8 }}>
          {
            // check if there are any result params and display info if there are
            activeNode.data.formData.find(
              (obj: any) => obj.paramType === "result"
            ) && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="body2">Result Parameters</Typography>
                <Tooltip title="Result parameters use outputs from previous steps by default. Uncheck to provide your own value.">
                <IconButton size="small"
                  onClick={() => {
                    alert(
                      "Result parameteres are results of experiments that were previously run in the workflow. By default we will use their outputs, if you would like to specify a different input, you can deselect and enter what we should use."
                    );
                  }}
                >
                  <InfoOutlinedIcon />
                </IconButton>
                </Tooltip>
              </Box>
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
          </AccordionDetails>
        </Accordion>
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
