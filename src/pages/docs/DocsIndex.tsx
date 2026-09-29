import { Link as RouterLink } from "react-router";
import { Box, Button, Card, CardActionArea, CardContent, Chip, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { DOCS_PAGES } from "./docsPages";

/** /docs — the public documentation hub. Reachable without signing in. */
export default function DocsIndex() {
  return (
    <>
      <Box component="header" sx={{ mb: 5 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.12em" }}>
          Documentation
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1.5 }}>
          DAMPLab Canvas
        </Typography>
        <Typography sx={{ fontSize: "1.125rem", color: "text.secondary", maxWidth: 760, mb: 2 }}>
          Canvas is the web platform the DAMP Lab at Boston University uses to take on laboratory work. Clients design a
          molecular-biology workflow, submit it as a job, and follow it through the lab; lab staff review, schedule and run
          that work.
        </Typography>
        <Typography sx={{ color: "text.secondary", maxWidth: 760 }}>
          These pages explain what Canvas is and how it works, written for readers without a software background.
        </Typography>
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          p: 0,
          m: 0,
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {DOCS_PAGES.map((page) => (
          <Box component="li" key={page.slug}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea component={RouterLink} to={page.path} sx={{ height: "100%", alignItems: "stretch" }}>
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                      {page.title}
                    </Typography>
                    {page.ready ? (
                      <ArrowForwardIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    ) : (
                      <Chip size="small" label="Coming soon" variant="outlined" />
                    )}
                  </Box>
                  <Typography color="text.secondary">{page.summary}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 6, pt: 3, borderTop: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
        <Typography color="text.secondary" sx={{ maxWidth: 680, fontSize: 14 }}>
          Canvas is built by the Software &amp; Application Innovation Lab (SAIL) at Boston University's Hariri Institute
          for Computing, for the DAMP Lab, as part of the NSF-funded Programmable Cloud Laboratories (PCL) program.
        </Typography>
        <Button component={RouterLink} to="/canvas" variant="contained" sx={{ textTransform: "none" }}>
          Open Canvas
        </Button>
      </Box>
    </>
  );
}
