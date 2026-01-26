// SOWDocument.tsx - PDF document component for Statement of Work
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { SOWData } from '../types/SOWTypes';

// Using default fonts to avoid font loading issues

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
  },
  logoContainer: {
    backgroundColor: '#000000',
    padding: 10,
    marginBottom: 10,
    width: 280,
  },
  logo: {
    width: 250,
    height: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 11,
    marginBottom: 10,
  },
  sowNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'left',
  },
  listItem: {
    marginBottom: 5,
    marginLeft: 10,
  },
  table: {
    width: '100%',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingVertical: 5,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  tableCellLarge: {
    flex: 2,
    paddingHorizontal: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 5,
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 9,
    textAlign: 'center',
  },
});

interface SOWDocumentProps {
  sowData: SOWData;
}

const SOWDocument: React.FC<SOWDocumentProps> = ({ sowData }) => {
  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Document>
      <Page style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              style={styles.logo} 
              src="https://static.wixstatic.com/media/474df2_ec8549d5afb648c692dc6362a626e406~mv2.png/v1/fill/w_496,h_76,al_c,lg_1,q_85,enc_auto/BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"
            />
          </View>
          <Text style={styles.title}>DAMP Lab</Text>
          <Text style={styles.address}>610 Commonwealth Avenue, 4th Floor, Boston, MA 02215</Text>
        </View>
        <Text style={styles.sowNumber}>
          {sowData.sowNumber} for Agreement to Perform Research Services for {sowData.clientName}
        </Text>

        {/* Date and Parties */}
        <View>
          <Text>Date Services Performed By: {sowData.date}</Text>
          <Text>Services Performed For:</Text>
          <Text style={styles.bold}>Trustees of Boston University</Text>
          <Text>DAMP Lab of Boston University</Text>
          <Text>610 Commonwealth Avenue</Text>
          <Text>Boston, MA 02215</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.bold}>{sowData.clientName}</Text>
          <Text>{sowData.clientInstitution}</Text>
          <Text>{sowData.clientAddress || 'Address not provided'}</Text>
        </View>

        {/* Statement of Work Introduction */}
        <Text style={styles.sectionTitle}>Statement of Work</Text>
        <Text style={styles.paragraph}>
          This Statement of Work (SOW) contains price and time information as per the discussions between the 
          Trustees of Boston University on behalf of the DAMP Lab at Boston University (hereinafter, "DAMP") 
          and the potential client, to be officially reviewed and assigned by both parties. It contains the 
          description of the services to be performed by DAMP, with relevant costs and terms, including scope 
          of work, deliverables, and responsibilities of DAMP.
        </Text>

        <Text style={styles.paragraph}>
          {sowData.sowNumber}, effective as of {sowData.date} is entered into by and between DAMP and {sowData.clientName} 
          and is subject to the terms and conditions specified below. The Exhibit(s) to this SOW, if any, shall 
          be deemed to be a part hereof. In the event of any inconsistency between the terms of the body of this 
          SOW and the terms of the Exhibit(s) hereto, the terms of the body of this SOW shall prevail.
        </Text>

        {/* Period of Performance */}
        <Text style={styles.sectionTitle}>Period of Performance</Text>
        <Text style={styles.paragraph}>
          The total turn-around time is estimated to be within {sowData.timeline.duration} from the start date. 
          Therefore, the services herewith mentioned shall commence on {sowData.timeline.startDate} and continue 
          until {sowData.timeline.endDate}.
        </Text>

        {/* Engagement Resources */}
        <Text style={styles.sectionTitle}>Engagement Resources</Text>
        <Text style={styles.paragraph}>
          The Services contemplated by this SOW shall be performed by the DAMP team, which shall include the 
          following individuals:
        </Text>
        <Text style={styles.listItem}>{sowData.resources.projectManager} – Project Manager</Text>
        <Text style={styles.listItem}>{sowData.resources.projectLead} - Project Lead</Text>

        {/* Scope of Work */}
        <Text style={styles.sectionTitle}>Scope of Work</Text>
        {Array.isArray(sowData.scopeOfWork) ? (
          sowData.scopeOfWork.map((item, index) => (
            <Text key={index} style={styles.listItem}>
              {index + 1}) {item}
            </Text>
          ))
        ) : (
          // Fallback for old string format - split by newlines if present
          typeof sowData.scopeOfWork === 'string' ? (
            sowData.scopeOfWork.split('\n').map((line, index) => (
              line.trim() && (
                <Text key={index} style={styles.listItem}>
                  {index + 1}) {line.trim()}
                </Text>
              )
            ))
          ) : (
            <Text style={styles.paragraph}>{String(sowData.scopeOfWork)}</Text>
          )
        )}

        {/* Deliverables */}
        <Text style={styles.sectionTitle}>Deliverables</Text>
        {sowData.deliverables.map((deliverable, index) => (
          <Text key={index} style={styles.listItem}>• {deliverable}</Text>
        ))}

        {/* University Responsibilities */}
        <Text style={styles.sectionTitle}>University Responsibilities</Text>
        <Text style={styles.paragraph}>
          It is the responsibility of the University to provide regular and detailed updates about the Project 
          and Project development, and to ensure that services are delivered on time with high-quality results 
          and that the agreed number of service hours dedicated by the DAMP Lab team for the Project are rendered.
        </Text>

        {/* Client Responsibilities */}
        <Text style={styles.sectionTitle}>Client Responsibilities</Text>
        <Text style={styles.paragraph}>
          The client is responsible for delivering all necessary materials and samples to the DAMP Lab for 
          processing as well as all data analysis unless otherwise specified.
        </Text>

        {/* Fee Schedule */}
        <Text style={styles.sectionTitle}>Fee Schedule</Text>
        <Text style={styles.paragraph}>
          This engagement will be conducted on a Project basis. The total value for the Services pursuant 
          to this SOW is presented in the following table:
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellLarge}>Service Description</Text>
            <Text style={styles.tableCell}>Total Cost</Text>
          </View>
          {sowData.services.map((service, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCellLarge}>{service.name}</Text>
              <Text style={styles.tableCell}>{formatCurrency(service.cost)}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, { fontWeight: 'bold', backgroundColor: '#f9f9f9' }]}>
            <Text style={styles.tableCellLarge}>Total</Text>
            <Text style={styles.tableCell}>{formatCurrency(sowData.pricing.totalCost)}</Text>
          </View>
        </View>

        {sowData.pricing.discount && (
          <Text style={[styles.paragraph, styles.italic]}>
            *{sowData.pricing.discount.reason}: {formatCurrency(sowData.pricing.discount.amount)} discount applied.
          </Text>
        )}

        <Text style={styles.paragraph}>
          Upon completion of the initial performance period, University and the Client will have the option 
          to renew this SOW for an additional then-stated project for those resources identified.
        </Text>

        {/* Bill To Address */}
        <Text style={styles.sectionTitle}>Bill To Address</Text>
        <Text>610 Commonwealth Avenue, 4th Floor, Room 421, Boston – MA – 02215.</Text>

        {/* Invoice Procedures */}
        <Text style={styles.sectionTitle}>Invoice Procedures</Text>
        <Text style={styles.paragraph}>
          Client will be invoiced for the Services. It is agreed by the parties that standard invoicing is acceptable. 
          Payments are due upon receipt of such invoices.
        </Text>
        <Text style={styles.paragraph}>
          Invoices shall be submitted in arrears, referencing this SOW Number to the address indicated above. 
          Terms of payment for the invoice are due upon receipt by Client of a proper invoice. DAMP Lab shall 
          provide Client with sufficient details to support its invoices, including list of services performed 
          and justifications for authorized expenses, unless otherwise agreed to by the parties.
        </Text>

        {/* Completion Criteria */}
        <Text style={styles.sectionTitle}>Completion Criteria</Text>
        <Text style={styles.paragraph}>
          DAMP Lab shall have fulfilled its obligations when any one of the following first occurs:
        </Text>
        <Text style={styles.listItem}>
          • DAMP Lab completes the Services described within this SOW, and Client accepts such Services 
          without unreasonable objections. No response from Client within 2-business days of deliverables 
          being delivered by DAMP Lab is deemed acceptance.
        </Text>
        <Text style={styles.listItem}>
          • DAMP Lab and/or Client has the right to cancel the Services not yet provided with 20 business 
          days advance written notice to the other party.
        </Text>

        {/* Project Change Control Procedure */}
        <Text style={styles.sectionTitle}>Project Change Control Procedure</Text>
        <Text style={styles.paragraph}>
          The following process will be followed if a change to this SOW is required:
        </Text>
        <Text style={styles.listItem}>
          • A Project Change Request (PCR) will be the vehicle for communicating change. The PCR must describe 
          the change, the rationale for the change, and the effect the change will have on the Project.
        </Text>
        <Text style={styles.listItem}>
          • The designated Project Manager of the requesting party (University or Client) will review the 
          proposed change and determine whether to submit a request to the other party.
        </Text>
        <Text style={styles.listItem}>
          • Both Project Managers will review the proposed change and approve it for further consideration or 
          reject it. The parties shall determine the effect that the implementation of the PCR will have on 
          SOW price, schedule and other terms and conditions of the Agreement.
        </Text>

        {/* Additional Information */}
        {sowData.additionalInformation && (
          <>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <Text style={styles.paragraph}>{sowData.additionalInformation}</Text>
          </>
        )}

        {/* Signature Section */}
        <Text style={styles.sectionTitle}>Signatures</Text>
        <Text style={styles.paragraph}>
          IN WITNESS WHEREOF, the parties hereto have caused this SOW to be effective as of the day, month 
          and year first written above.
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>{sowData.clientName}</Text>
            <Text>({sowData.clientEmail})</Text>
            <Text>{sowData.clientInstitution}</Text>
            <View style={styles.signatureLine}></View>
            <Text>Date:</Text>
            <View style={styles.signatureLine}></View>
            <Text>Name:</Text>
            <View style={styles.signatureLine}></View>
            <Text>Title:</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text>Trustees of Boston University</Text>
            <Text>By:</Text>
            <View style={styles.signatureLine}></View>
            <Text>Date:</Text>
            <View style={styles.signatureLine}></View>
            <Text>Name: {sowData.resources.projectManager}</Text>
            <View style={styles.signatureLine}></View>
            <Text>Title: Project Manager</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>DAMP Lab © | Statement of Work | Generated on {sowData.date}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default SOWDocument;
