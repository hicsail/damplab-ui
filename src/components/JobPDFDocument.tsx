// JobPDFDocument.tsx
import React from 'react';
import { Document, Page, Canvas, StyleSheet, View, Text, Image } from '@react-pdf/renderer';
import { Workflow } from '../gql/graphql';

// Register font
import { Font } from '@react-pdf/renderer';

Font.register({ family: 'Courier-New', fonts: [{ src: '/fonts/Courier-New.ttf' }] });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    position: 'relative'
  },
  section: {
    margin: 15,
    padding: 15,
    wrap: false
  },
  jobParam: {
    margin: 10,
    fontSize: 12,
  },
  workflow: {
    fontSize: 20,
    padding: 30,
    // paddingBottom: -20,
  },
  service: {
    marginBottom: 10,
    fontSize: 15,
  },
  parameter: {
    fontSize: 12,
    margin: 10,
  },
  canvas: {
    width: '100%',
    height: 20,
  },
  header: {
    margin: 15,
    padding: 15,
    flexDirection: 'column',
    fontSize: 10,
    fontFamily: 'Courier-New',
  },
  headerElement: {
    margin: 5,
  },
  footer: {
    position: 'absolute',
    left: '5%',
    bottom: '3%',
    fontSize: 10,
  },
  pageNumber: {
    position: 'absolute',
    right: '5%',
    bottom: '3%',
    fontSize: 10,
  },
});

const getCurrentDateTime = () => {
  const now = new Date();
  return now.toLocaleString(); // Formats date and time as per local conventions
};

interface JobPDFDocumentProps {
  jobId: string | undefined;
  jobName: string;
  jobUsername: string;
  jobEmail: string;
  jobInstitution: string;
  jobNotes: string;
  jobTime: string;
  workflows: Workflow[];
}

const JobPDFDocument: React.FC<JobPDFDocumentProps> = ({
  jobId,
  jobName,
  jobUsername,
  jobEmail,
  jobInstitution,
  jobNotes,
  jobTime,
  workflows,
}) => ( jobId ? 
  <Document>
    <Page>
      <Canvas
        style={styles.canvas}
        paint={(Painter) =>
          Painter.moveTo(10, 10) // Top-left corner, going clockwise...
            .lineTo(585, 10)
            .lineTo(585, 831)
            .lineTo(10, 831)
            .lineTo(10, 10)
            .moveTo(15, 15) // Second border line
            .lineTo(580, 15)
            .lineTo(580, 826)
            .lineTo(15, 826)
            .lineTo(15, 15)
            .stroke()
        }
      />
      <Text style={{ marginTop: '5%', fontSize: 25, textAlign: 'center'}}>DAMP Lab Order Summary</Text>
      <Image source={"/damp-lab-logo-2x.png"} style={{ width: '30%', margin: 35, marginBottom: -10 }} />
      <View style={styles.header}>
        <Text style={styles.headerElement}>DAMP (Design Automation Manufacturing Processes) Lab</Text>
        <Text style={styles.headerElement}>damplab@bu.edu</Text>
        <Text style={styles.headerElement}>https://www.damplab.org/contact</Text>
        <Text style={styles.headerElement}>610 Commonwealth Ave, 4th Floor, Boston, MA 02215</Text>
        <Text style={styles.headerElement}>PDF generated on: {getCurrentDateTime()}</Text>
      </View>
      <Canvas
        style={styles.canvas}
        paint={(Painter) => Painter.moveTo(25, 10).lineTo(565, 10).stroke()}
      />
      <View style={styles.section}>
        <Text style={{ margin: 10, fontSize: 16 }}>Job Submission Details</Text>
        <Text style={styles.jobParam}>Job Name: {jobName}</Text>
        <Text style={styles.jobParam}>Job ID: {jobId}</Text>
        <Text style={styles.jobParam}>Submitter Name: {jobUsername}</Text>
        <Text style={styles.jobParam}>Submitter Email: {jobEmail}</Text>
        <Text style={styles.jobParam}>Submitter Institution: {jobInstitution}</Text>
        <Text style={styles.jobParam}>Submitter's Notes: {jobNotes}</Text>
        <Text style={styles.jobParam}>Submission Time: {jobTime}</Text>
      </View>
      <Text style={styles.footer}>DAMP Lab © | Job Submission Summary</Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`${pageNumber} / ${totalPages}`)} fixed />
    </Page>
    {workflows.map((workflow, index) => (
      <Page key={index}>
        <Canvas
          style={styles.canvas}
          paint={(Painter) =>
            Painter.moveTo(10, 10) // Top-left corner, going clockwise...
              .lineTo(585, 10)
              .lineTo(585, 831)
              .lineTo(10, 831)
              .lineTo(10, 10)
              .moveTo(15, 15) // Second border line
              .lineTo(580, 15)
              .lineTo(580, 826)
              .lineTo(15, 826)
              .lineTo(15, 15)
              .stroke()
          }
          fixed
        />
        <Text style={styles.workflow}>{workflow.name}</Text>
        {workflow.nodes.map((service, ind) => (
          <View key={ind} style={styles.section}>
            <Text style={styles.service}>{service.label}</Text>
            {(Array.isArray(service.formData) ? service.formData : []).map((parameter: any, i: number) => {
              const label = parameter.name ?? parameter.id ?? 'Parameter';
              const displayValue = Array.isArray(parameter.value)
                ? parameter.value.filter((v: any) => v != null && String(v).trim() !== '').join(', ')
                : parameter.value;
              if (parameter.type === 'boolean') {
                if (parameter.value === true) {
                  return(<Text key={i} style={styles.parameter}>{label}: true</Text>)
                } else {
                  return(<Text key={i} style={styles.parameter}>{label}: {parameter.resultParamValue}</Text>)
                }
              } else {
                return(<Text key={i} style={styles.parameter}>{label}: {displayValue}</Text>)
              }
            })}
          </View>
        ))}
        <Text key={index} style={styles.footer} fixed >DAMP Lab © | Job Submission Summary</Text>
        <Text key={index} style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`${pageNumber} / ${totalPages}`)} fixed />
      </Page>
    ))}
  </Document>
  :
  <div>
    PDF Unavailable
  </div>
);

export default JobPDFDocument;
