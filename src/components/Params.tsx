import React, { useContext, useEffect, useState } from "react";
import { useFormik } from "formik";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import ParamTableOnForm from "./ParamTableOnForm";
import { CanvasContext } from "../contexts/Canvas";
import { normalizeBookerEmails, validateEquipmentValues } from "../utils/equipmentParams";
import SampleSheetField from "./SampleSheetField";
import { isSampleSheetParam } from "../utils/sampleSheet";

interface ParamFormProps {
  activeNode: any; // Replace 'any' with the appropriate type for activeNode
  onFormDataChange?: () => void;
  /**
   * Parameter ids that differ from the job editor's diff baseline. Only the job
   * editor supplies this; on the ordinary canvas it is undefined and nothing is
   * decorated.
   */
  changedParamIds?: Set<string>;
  /**
   * Show the parameters without letting them be changed.
   *
   * Deliberately carried as an explicit prop rather than left to the
   * `pointer-events: none` wrapper RightSidebar puts around this, which does not
   * hold: MUI sets `pointer-events: auto` on a shrunk outlined InputLabel and
   * links it to its input with `htmlFor`, so clicking a filled-in parameter's
   * *label* reached through the wrapper, focused the input, and the keyboard did
   * the rest — typing over a value on a canvas that called itself read only.
   * (Tabbing straight into a field was never covered either; pointer-events has
   * no say over focus.) Labels on Selects carry no `htmlFor`, so those were only
   * ever reachable by keyboard, which MUI's own `readOnly` blocks.
   *
   * Inputs get `readOnly` rather than `disabled` so a customer can still read and
   * copy what was submitted instead of squinting at greyed-out text.
   */
  readOnly?: boolean;
  /**
   * Whether a samples spreadsheet can be picked here. True on the canvas,
   * where parameter files are uploaded at submission; the job editor passes
   * false because it has no upload step — sheets on a submitted job are
   * replaced from the job page.
   */
  sampleSheetUploadable?: boolean;
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

/**
 * The `emails` param's text box, as its own component so the per-field draft
 * state is a real hook rather than something conjured inside the render
 * loop's `.map` callback.
 *
 * The box is controlled: `draft` is local state seeded from the joined
 * formik array and resynced whenever that array changes from the outside
 * (e.g. a chip's delete button, or a node switch). A `defaultValue` box
 * never re-reads after mount, so deleting a chip left the box showing the
 * stale, pre-delete list — and the next blur re-normalised that stale text
 * back into formik, silently resurrecting the address just removed.
 *
 * `initValues` turns a bare `[]` into `[""]` for every array-valued param
 * (a pre-existing sentinel this component does not own), so blanks are
 * filtered out of both the chip row and the joined text before display.
 */
function EmailsField({
  param,
  value,
  error,
  readOnly,
  onCommit,
}: {
  param: any;
  value: string[];
  error?: unknown;
  readOnly: boolean;
  onCommit: (next: string[]) => void;
}) {
  const emails = value.filter((email) => email !== "");
  const joined = emails.join(", ");
  const [draft, setDraft] = useState(joined);

  useEffect(() => {
    setDraft(joined);
  }, [joined]);

  return (
    <div style={{ marginTop: 24 }}>
      <TextField
        size="small"
        label={param.name}
        placeholder="name@example.com, other@example.com"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(normalizeBookerEmails(draft.split(",")))}
        sx={{ width: "36ch" }}
        InputLabelProps={{ shrink: true }}
        InputProps={{ readOnly }}
        error={Boolean(error)}
        helperText={error ? String(error) : (param.description ? param.description : "Comma-separated. Optional.")}
      />
      <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {emails.map((email) => (
          <Chip
            key={email}
            label={email}
            size="small"
            onDelete={readOnly ? undefined : () => onCommit(emails.filter((e) => e !== email))}
          />
        ))}
      </Box>
    </div>
  );
}

export default function ({ activeNode, onFormDataChange, changedParamIds, readOnly = false, sampleSheetUploadable = true }: ParamFormProps) {
  const [paramErrors, setParamErrors]: any = useState([]);

  /** Marks one parameter as edited relative to the diff baseline. */
  const wrapChanged = (param: any, element: React.ReactNode): React.ReactNode => {
    if (!element || !changedParamIds?.has(param?.id)) return element;
    return (
      <Box
        key={param.id}
        sx={{ mt: 1, pl: 1, py: 0.5, borderLeft: '3px solid #ed6c02', backgroundColor: 'rgba(237, 108, 2, 0.08)', borderRadius: 0.5 }}
      >
        <Typography variant="caption" sx={{ display: 'block', color: '#ed6c02', fontWeight: 700 }}>Edited</Typography>
        {element}
      </Box>
    );
  };
  const { setNodes } = useContext(CanvasContext);

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
        if (obj.type === "file" || isSampleSheetParam(obj)) {
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
        if (obj.type === "file" || isSampleSheetParam(obj)) {
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

    // The reserved equipment parameters carry rules the generic required-field pass
    // cannot express: a date pair that must not invert, an integer floor, and a list of
    // addresses. Returns nothing at all for a node that has none of them.
    Object.assign(errors, validateEquipmentValues(values));

    setParamErrors(errors);
    return errors;
  };

  const buildUpdatedFormData = (values: any) => {
    return activeNode.data.formData.map((obj: any) => {
      const updated = { ...obj };
      if (updated.paramType === "result") {
        updated.resultParamValue = values[`resultParamValue${updated.id}`];
      }
      updated.value = values[updated.id];
      return updated;
    });
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
    onSubmit: () => {},
  });


  // update values to active node form data and validate
  useEffect(() => {
    const updatedFormData = buildUpdatedFormData(formik.values);
    setNodes((nds: any[]) =>
      nds.map((node: any) =>
        node.id === activeNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                formData: updatedFormData,
              },
            }
          : node
      )
    );
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
        <Accordion defaultExpanded sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
        <div className="input-params" style={{ marginLeft: 8 }}>
          {activeNode.data.formData.map((param: any) => wrapChanged(param, (() => {
            if (param.paramType !== "result") {
              if (param.type === "date") {
                const raw = formik.values[param.id];
                const parsed = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
                  ? new Date(`${raw}T00:00:00`)
                  : null;
                return (
                  <div key={param.id} style={{ marginTop: 24 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label={param.name}
                        value={parsed}
                        readOnly={readOnly}
                        onChange={(next: Date | null) => {
                          // Stored as a date-only string: the value is a calendar day, and a
                          // timestamp would shift it across a timezone or a DST boundary.
                          if (!next || Number.isNaN(next.getTime())) {
                            formik.setFieldValue(param.id, "");
                            return;
                          }
                          const y = next.getFullYear();
                          const m = String(next.getMonth() + 1).padStart(2, "0");
                          const d = String(next.getDate()).padStart(2, "0");
                          formik.setFieldValue(param.id, `${y}-${m}-${d}`);
                        }}
                        slotProps={{
                          textField: {
                            size: "small",
                            sx: { width: "26ch" },
                            error: Boolean(formik.errors[param.id]),
                            helperText: formik.errors[param.id]
                              ? String(formik.errors[param.id])
                              : (param.description ? param.description : null),
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </div>
                );
              }
              if (param.type === "boolean") {
                // There is no boolean branch below: an untyped fallback would render this
                // as <TextField type="boolean">, i.e. a text box. Stored as a real boolean
                // so the pricer, the diff seed and the PDF all read the same value.
                return (
                  <div key={param.id} style={{ marginTop: 16 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formik.values[param.id] === true}
                          disabled={readOnly}
                          onChange={(e) => formik.setFieldValue(param.id, e.target.checked)}
                        />
                      }
                      label={param.name}
                    />
                    {param.description ? <FormHelperText sx={{ ml: 4, mt: -0.5 }}>{param.description}</FormHelperText> : null}
                  </div>
                );
              }
              if (param.type === "emails") {
                const emails: string[] = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [];
                return (
                  <EmailsField
                    key={param.id}
                    param={param}
                    value={emails}
                    error={formik.errors[param.id]}
                    readOnly={readOnly}
                    onCommit={(next) => formik.setFieldValue(param.id, next)}
                  />
                );
              }
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
                    {param.dynamicAdd && !readOnly && (
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
                        param.addedDynamically && !readOnly && (
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
                      readOnly={readOnly}
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
                                readOnly={readOnly}
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
                            {idx > 0 && !readOnly && (
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
                            {idx === 0 && !readOnly && (
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
              if (isSampleSheetParam(param)) {
                // The form entry carries only the fields generateFormDataFromParams
                // copies; the template reference lives on the service's parameter
                // definition, which the node keeps alongside.
                const paramDef = (activeNode?.data?.parameters ?? []).find((p: any) => p?.id === param.id);
                return (
                  <SampleSheetField
                    key={param.id}
                    param={paramDef?.templateFile ? { ...param, templateFile: paramDef.templateFile } : param}
                    value={formik.values[param.id]}
                    serviceId={activeNode?.data?.serviceId}
                    readOnly={readOnly}
                    uploadable={sampleSheetUploadable}
                    onChange={(next) => formik.setFieldValue(param.id, next)}
                  />
                );
              }
              if (param.type === "file") {
                if (isMultiValueParam(param)) {
                  const files = Array.isArray(formik.values[param.id]) ? formik.values[param.id] : [];
                  return (
                    <div key={param.id} style={{ marginTop: 12 }}>
                      {readOnly ? (
                        <FormHelperText sx={{ m: 0, fontWeight: 600 }}>{param.name}</FormHelperText>
                      ) : (
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
                      )}
                      {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}
                      <Box sx={{ mt: 1 }}>
                        {files.map((f: any, idx: number) => (
                          <Box key={f?.localId ?? idx} display="flex" alignItems="center" gap={0.5}>
                            <FormHelperText sx={{ m: 0 }}>
                              {isPendingParamFile(f) ? f.filename : "Uploaded file"}
                            </FormHelperText>
                            {!readOnly && (
                              <IconButton
                                size="small"
                                onClick={() => formik.setFieldValue(param.id, files.filter((_: any, i: number) => i !== idx))}
                                aria-label="Remove file"
                              >
                                <DeleteForeverSharp fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </div>
                  );
                }
                const fileValue = formik.values[param.id];
                return (
                  <div key={param.id} style={{ marginTop: 12 }}>
                    {readOnly ? (
                      <FormHelperText sx={{ m: 0, fontWeight: 600 }}>{param.name}</FormHelperText>
                    ) : (
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
                    )}
                    {param.description ? <FormHelperText>{param.description}</FormHelperText> : null}
                    {fileValue ? (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                        <FormHelperText sx={{ m: 0 }}>
                          {isPendingParamFile(fileValue) ? fileValue.filename : "Uploaded file"}
                        </FormHelperText>
                        {!readOnly && (
                          <IconButton size="small" onClick={() => formik.setFieldValue(param.id, null)} aria-label="Remove file">
                            <DeleteForeverSharp fontSize="small" />
                          </IconButton>
                        )}
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
                              InputProps={{ readOnly }}
                            />
                            {idx > 0 && !readOnly && (
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
                            {idx === 0 && !readOnly && (
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
                    {param.dynamicAdd && !readOnly && (
                      <IconButton onClick={() => alert("Dynamic Add")}>
                        <InfoOutlinedIcon />
                      </IconButton>
                    )}
                    <TextField
                      multiline={
                        param.name === "Additional Notes" ? true : false
                      }
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
                      InputProps={{ readOnly }}
                      inputProps={param.isPriceMultiplier === true && param.type === 'number' ? { min: 1, step: 1 } : undefined}
                    />
                  </div>
                );
            } else {
              return null;
            }
          })()))}
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
                    disabled={readOnly}
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
                          readOnly={readOnly}
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
