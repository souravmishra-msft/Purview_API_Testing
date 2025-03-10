import { Box, Button, Tab, Tabs, TextField, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import React, { useContext, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { ApiContext } from "../APIContext";
import { TerminalContext } from "../TerminalContext";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import axios from "axios";

const RequestSection = () => {
  const { endpoint, scopes } = useContext(ApiContext);
  const { appendTerminalOutput, setResponseBody, setResponseHeaders } = useContext(TerminalContext);
  const { instance, accounts } = useMsal();
  const [tabValue, setTabValue] = useState(0);
  const [headers, setHeaders] = useState([
    { key: "Content-Type", value: "application/json" },
    { key: "Authorization", value: "Bearer" },
  ]);
  const [requestBody, setRequestBody] = useState("{\n  \n}");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRequestBodyChange = (event) => {
    setRequestBody(event.target.value);
  };

  const handleAddHeader = () => {
    setHeaders([...headers, { key, value }]);
    setKey("");
    setValue("");
  };

  const handleDeleteHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const acquireToken = async (request) => {
    try {
      const response = await instance.acquireTokenSilent(request);
      const accessToken = response.accessToken;
      appendTerminalOutput("User token acquired successfully...");
      return accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenRedirect(request);
          const accessToken = response.accessToken;
          appendTerminalOutput("User token acquired successfully...");
          console.log("Access-Token: ", accessToken);
          return accessToken;
        } catch (error) {
          console.error("Acquire Token error:", error);
          appendTerminalOutput("Error acquiring token", error);
          throw error;
        }
      } else {
        console.error("Silent token acquisition error: ", error);
        appendTerminalOutput("Silent token acquisition error: ", error);
        throw error;
      }
    }
  };

  const makeApiCall = async (accessToken) => {
    try {
      const updatedHeaders = headers.map((header) => (header.key === "Authorization" ? { ...header, value: `Bearer ${accessToken}` } : header));
      setHeaders(updatedHeaders);
      const headersObj = updatedHeaders.reduce((acc, header) => {
        acc[header.key] = header.value;
        return acc;
      }, {});

      const apiResponse = await axios.get(endpoint, { headers: headersObj });
      console.log("API Response: ", apiResponse);
      appendTerminalOutput(JSON.stringify(apiResponse.data, null, 2));
      setResponseBody(JSON.stringify(apiResponse.data, null, 2));
      setResponseHeaders(JSON.stringify(apiResponse.headers, null, 2));
    } catch (error) {
      console.error("API call error: ", error);
      appendTerminalOutput("API call error: ", error);
    }
  };

  const handleSendRequest = async () => {
    console.log(`Endpoint: ${endpoint} \nScopes: ${scopes}`);

    if (accounts.length > 0) {
      const account = accounts[0];
      if (account) {
        if (endpoint && scopes) {
          appendTerminalOutput("Acquiring user token...");
          const request = {
            scopes: [scopes],
            account: account,
          };
          console.log(request);

          try {
            const accessToken = await acquireToken(request);
            await makeApiCall(accessToken);
          } catch (error) {
            console.error("Error during request handling: ", error);
          }
        } else {
          appendTerminalOutput("Please select an API and provide the required scopes...");
        }
      } else {
        appendTerminalOutput("No accounts available...");
      }
    }
  };

  return (
    <Box sx={styles.requestSection}>
      <Tabs value={tabValue} onChange={handleChange}>
        <Tab label="Request Body" sx={{ textTransform: "capitalize" }} />
        <Tab label="Request Headers" sx={{ textTransform: "capitalize" }} />
      </Tabs>
      {tabValue === 0 && (
        <Box sx={styles.bodyBox}>
          <TextField id="request-body" multiline rows={5} variant="outlined" fullWidth value={requestBody} onChange={handleRequestBodyChange} sx={{ height: "100%", overflow: "auto" }} />
        </Box>
      )}
      {tabValue === 1 && (
        <Box sx={styles.headerBox}>
          <Box sx={styles.headerValueInput}>
            <TextField id="request-headers-key" variant="outlined" placeholder="Key" value={key} onChange={(e) => setKey(e.target.value)} size="small" fullWidth />
            <TextField id="request-headers-value" variant="outlined" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} size="small" fullWidth />
            <Button variant="contained" sx={{ textTransform: "capitalize" }} onClick={handleAddHeader}>
              Add
            </Button>
          </Box>
          <Box sx={styles.headerValueTable}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#8e8e8e" }}>
                <TableRow>
                  <TableCell sx={{ color: "white" }}>Key</TableCell>
                  <TableCell sx={{ color: "white" }}>Value</TableCell>
                  <TableCell sx={{ color: "white" }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {headers.map((header, index) => (
                  <TableRow key={index}>
                    <TableCell>{header.key}</TableCell>
                    <TableCell sx={styles.headerValue}>{header.value}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteHeader(index)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Button variant="contained" sx={{ textTransform: "capitalize" }} onClick={handleSendRequest}>
          Send Request
        </Button>
      </Box>
    </Box>
  );
};

export default RequestSection;

/** @type {import("@mui/material").SxProps} */
const styles = {
  requestSection: {
    p: 1,
    width: "100%",
    height: "320px",
    overflow: "auto",
    border: "2px solid #ccc",
    borderRadius: 2,
  },
  bodyBox: {
    mt: 2,
    height: "150px",
    overflow: "auto",
  },
  headerBox: {
    mt: 2,
    px: 2,
    height: "150px",
    overflow: "auto",
  },
  headerValueInput: {
    display: "flex",
    gap: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerValueTable: {
    mt: 2,
    width: "100%",
  },
  headerValue: {
    maxWidth: "300px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
