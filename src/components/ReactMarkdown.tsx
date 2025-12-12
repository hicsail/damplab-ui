import ReactMarkdown from "react-markdown";
import { Typography } from "@mui/material";
 
type MarkdownProps = {
  children: string;
};

export default function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
        components={{
          p: ({ children }) => (
            <Typography variant="body1" component="p" sx={{ mb: 2 }}>
              {children}
            </Typography>
          ),
          strong: ({ children }) => (
            <Typography component="span" fontWeight="bold">
              {children}
            </Typography>
          ),
          em: ({ children }) => (
            <Typography component="span" fontStyle="italic">
              {children}
            </Typography>
          ),
          h1: ({ children }) => (
            <Typography variant="h5" component="h1" color="primary" sx={{ mb: 2, fontWeight: "bold" }}>
              {children}
            </Typography>
          ),
          h2: ({ children }) => (
            <Typography variant="h6" component="h2" color="secondary" sx={{ mb: 1.5, fontWeight: "bold" }}>
              {children}
            </Typography>
          ),
          br: () => <br />,
        }}
        >
      {children} 
    </ReactMarkdown>
  );
}