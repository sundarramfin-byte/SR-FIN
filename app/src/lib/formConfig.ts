export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea" | "computed";
  options?: string[];
  wide?: boolean;
};

const f = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, ...extra });

const MARITAL = ["Single", "Married"];
const OWN = ["Rent", "Own"];

const addressFields = (): FieldDef[] => [
  f("doorNo", "D.No"),
  f("villaFlat", "Villa / Flat name"),
  f("street", "Street"),
  f("village", "Village / Town"),
  f("taluk", "Taluk"),
  f("district", "District"),
  f("pin", "PIN code"),
  f("landmark", "Landmark"),
];

export const applicantFields: FieldDef[] = [
  f("father", "Father name"),
  f("mother", "Mother name"),
  f("dob", "DOB", { type: "date" }),
  f("age", "Age", { type: "computed" }),
  f("qualification", "Qualification"),
  f("marital", "Single or Married", { type: "select", options: MARITAL }),
  f("husband", "Husband's name"),
  f("spouse", "Spouse name"),
  f("personalMail", "Email ID"),
  f("officialMail", "Official mail ID"),
  f("altContact", "Alternate contact no"),
  f("pan", "PAN number"),
  f("aadhaar", "Aadhaar number"),
];

export const currentAddressFields: FieldDef[] = [
  f("proof", "Current address proof"),
  ...addressFields(),
  f("yearsAtResidence", "Years at current residence", { type: "number" }),
  f("totalYearsInCity", "Total years in city", { type: "number" }),
  f("rentOrOwn", "Rent or own", { type: "select", options: OWN }),
];

export const permanentAddressFields: FieldDef[] = [f("proof", "Permanent address proof"), ...addressFields()];

const jobFields = (): FieldDef[] => [
  f("officeName", "Company / Office name"),
  f("officeAddress", "Company / Office address", { type: "textarea", wide: true }),
  f("designation", "Designation"),
  f("dateOfJoin", "Date of join", { type: "date" }),
  f("idCardNo", "ID card no"),
  f("officeContact", "Office contact no"),
  f("officeEmail", "Office email ID"),
  f("monthlyIncome", "Monthly income (Rs)", { type: "number" }),
  f("annualIncome", "Annual income (Rs)", { type: "number" }),
  f("yearsInJob", "Total years in current job", { type: "number" }),
  f("totalExperience", "Work experience (years)", { type: "number" }),
];

// SALARIED sheet
export const employmentFields: FieldDef[] = jobFields();

// NRI sheet: same as salaried + country
export const nriEmploymentFields: FieldDef[] = [f("country", "Country name"), ...jobFields()];

// SELF-EMPLOYED sheet: Business details
export const companyFields: FieldDef[] = [
  f("companyType", "Type of business", { type: "select", options: ["Pvt Ltd", "Partnership", "Proprietor"] }),
  f("noOfDirectors", "No. of directors", { type: "number" }),
  f("companyName", "Company / Business name", { wide: true }),
  f("incorporationDate", "Opening / incorporation date", { type: "date" }),
  f("yearsInBusiness", "No. of years", { type: "computed" }),
  f("monthlyIncome", "Monthly income (Rs)", { type: "number" }),
  f("annualIncome", "Annual income (Rs)", { type: "number" }),
  f("officeAddress", "Office address", { type: "textarea", wide: true }),
  f("totalExperience", "Work experience (years)", { type: "number" }),
  f("proof", "Address proof (MSME / GST)"),
  f("keyPerson", "Key person name"),
  f("keyPersonCell", "Key person cell no"),
  ...addressFields(),
  f("yearsAtOffice", "Years at current office", { type: "number" }),
];

// SELF-EMPLOYED sheet: Office / Business details
export const officeBusinessFields: FieldDef[] = [
  f("officeName", "Office name"),
  f("businessType", "Business type"),
  f("registrationNo", "Registration number (GST / CIN / Others)"),
  f("address", "Office address", { type: "textarea", wide: true }),
  f("contactNo", "Contact number"),
  f("email", "Email ID"),
  f("website", "Website (if any)"),
  f("yearsInBusiness", "Years in business", { type: "number" }),
  f("noOfEmployees", "Number of employees", { type: "number" }),
];

// SELF-EMPLOYED sheet: Employment / Business details (Co-applicant)
export const coEmploymentFields: FieldDef[] = [
  f("empType", "Employment type", { type: "select", options: ["Salaried", "Self-Employed", "Business"] }),
  f("empCompany", "Company / Business name"),
  f("empAddress", "Office address", { type: "textarea", wide: true }),
  f("empDesignation", "Designation"),
  f("empMonthlyIncome", "Monthly income (Rs)", { type: "number" }),
  f("empAnnualIncome", "Annual income (Rs)", { type: "number" }),
  f("empExperience", "Work experience (years)", { type: "number" }),
];

// LOAN REQUIREMENT DETAILS (all customer types)
export const loanRequirementFields: FieldDef[] = [
  f("loanType", "Type of loan"),
  f("purchaseCost", "Purchase cost (Rs)", { type: "number" }),
  f("loanAmount", "Loan amount required (Rs)", { type: "number" }),
  f("purpose", "Purpose of loan", { wide: true }),
];

// EXISTING LOAN DETAILS (all customer types) - one entry per loan
export const existingLoanFields: FieldDef[] = [
  f("loanType", "Loan type"),
  f("bankName", "Bank name"),
  f("outstanding", "Outstanding amount (Rs)", { type: "number" }),
  f("emi", "EMI (Rs)", { type: "number" }),
];

export const nriOfficeFields: FieldDef[] = [f("address", "NRI office address", { wide: true }), ...addressFields()];

export const coApplicantFields: FieldDef[] = [
  f("name", "Co-applicant full name", { wide: true }),
  f("father", "Father name"),
  f("husband", "Husband's name"),
  f("spouse", "Spouse name"),
  f("mother", "Mother name"),
  f("dob", "DOB", { type: "date" }),
  f("age", "Age", { type: "computed" }),
  f("marital", "Single or Married", { type: "select", options: MARITAL }),
  f("mobile", "Mobile number"),
  f("personalMail", "Email ID"),
  f("pan", "PAN number"),
  f("aadhaar", "Aadhaar number"),
  f("qualification", "Qualification"),
  ...addressFields(),
  f("permanentAddress", "Permanent address", { type: "textarea", wide: true }),
];

export const directorFields: FieldDef[] = coApplicantFields.map((x) =>
  x.key === "name" ? { ...x, label: "Director name" } : x,
);

export const referenceFields: FieldDef[] = [
  f("name", "Name"),
  f("phone", "Phone no"),
  f("address", "Address", { wide: true }),
  f("email", "Email ID"),
];

export const propertyFields: FieldDef[] = [
  f("propertyDetails", "Property details (Layout / Project name)", { wide: true }),
  f("address", "Property address", { wide: true }),
  f("owner", "Name of the owner"),
  f("plotNo", "Plot.No"),
  f("doorNo", "D.No"),
  f("sqft", "Square feet", { type: "number" }),
  f("surveyNo", "Survey no / TSLR no [ Old & New ]"),
  f("village", "Village / Town"),
  f("taluk", "Taluk"),
  f("district", "District"),
];
