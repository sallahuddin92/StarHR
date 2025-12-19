# **Technical Blueprint and Strategic Analysis for Next-Generation Malaysian HR Infrastructure (2025 Compliance Edition)**

## **Executive Overview**

The architecture of a Human Resources Management System (HRMS) for the Malaysian market in 2025 requires a fundamental reimagining of the traditional payroll software model. The convergence of increasingly complex statutory mandates—specifically the aggressive digitization of tax collection by the Inland Revenue Board of Malaysia (LHDN) and the landmark expansion of the Employees Provident Fund (EPF) to cover non-citizens—demands a system that is not merely a calculator, but a sophisticated compliance engine. Concurrently, the operational reality of the Malaysian workforce, particularly in the manufacturing, retail, and gig sectors, has outpaced the capabilities of legacy desktop-based or app-centric interfaces. The friction of adopting new mobile applications creates a barrier to entry for the blue-collar demographic, necessitating a shift toward ubiquitous platforms such as WhatsApp for employee self-service.

This report serves as a comprehensive technical and strategic dossier for the development of a high-value, compliant, and market-disrupting HR ecosystem. It deconstructs the requirements for a "compliance-first" payroll core capable of handling the 2025 regulatory shifts, an employer-integrated Earned Wage Access (EWA) liquidity engine, and a fraud-resistant attendance system, all underpinned by a frictionless WhatsApp Business API interface. The analysis that follows integrates deep technical specifications, legal logic derived from the Employment Act 1955 and Income Tax Act 1967, and strategic market positioning to challenge incumbents like PayrollPanda and Kakitangan.

## **Module 1: Core Payroll Architecture and Statutory Logic**

The nucleus of the proposed system is the payroll engine. In the Malaysian context, this is not a static ledger but a dynamic computational model that must adhere to the strictures of the Monthly Tax Deduction (Potongan Cukai Bulanan \- PCB) and the variable contribution logic of the EPF and SOCSO. The 2025 specifications introduce nuances that render many legacy algorithms obsolete, particularly regarding the taxation of additional remuneration and the inclusion of foreign workers in the provident fund net.

### **1.1 The 2025 PCB (MTD) Computational Kernel**

The Monthly Tax Deduction (PCB) mechanism is designed to approximate an employee's final annual tax liability to minimize the burden of a lump-sum payment at year-end. The system must implement the **Computerised Calculation Method (CCM)** as mandated by the Income Tax (Deduction from Remuneration) Rules 1994 and its subsequent amendments for 2025\.1 Unlike the "Schedule Method" (Jadual PCB), which uses range-based lookups suitable for manual payroll, the CCM provides exactitude by projecting annual income.

#### **1.1.1 The Chargeable Income Derivation ($P$)**

The accuracy of the PCB relies entirely on the correct derivation of Chargeable Income ($P$). The system must distinguish rigorously between "Normal Remuneration" (recurring income like basic salary and fixed allowances) and "Additional Remuneration" (variable income like bonuses and commissions). The fundamental formula for calculating the projected chargeable income for the year is:

$$P \= \+ \+ (Y\_{PREV} \- K\_{PREV}) \- D$$  
In this equation, $Y$ represents the current month's normal remuneration, and $K$ denotes the statutory deductions (EPF) associated with that normal remuneration. A critical architectural requirement is the annualization factor ($\\times 12$). The system projects the current month's normal data across the entire fiscal year. However, Additional Remuneration ($Y\_t$) is treated as a realized sum and is not annualized. This distinction is vital; creating a system that annualizes a one-off bonus would erroneously project the employee into a drastically higher tax bracket for the entire year, resulting in excessive over-deduction.1 The variable $Y\_{PREV}$ accounts for accumulated remuneration from previous employment within the current year, which must be captured via the TP3 form data entry interface during employee onboarding.

#### **1.1.2 Deductible Logic and Relief Management ($D$)**

The variable $D$ represents the total allowable deductions. The database schema must support a granular breakdown of reliefs rather than a lump sum, as these categories are subject to annual legislative changes. For 2025, the system must support the following standard reliefs, validated against the TP1 form submissions:

* **Individual Relief:** A static value of RM9,000.3  
* **Spouse Relief:** RM4,000, which requires a conditional logic check in the employee master record (Spouse Income Status \= None or Joint Assessment).  
* **Child Relief:** The algorithm must handle the tiered relief structure: RM2,000 for a child under 18, and RM8,000 for an unmarried child over 18 pursuing higher education (diploma level or above). The schema must allow for a "multiplier" field to handle the 4x relief for tertiary education without hardcoding the value.3  
* **Lifestyle & Medical:** Capped amounts (e.g., RM2,500 for lifestyle, RM8,000 for parental medical expenses) must be tracked cumulatively. The system needs a "claim accumulator" that rejects TP1 claims once the statutory cap for the tax year is reached.

#### **1.1.3 The Tax Bracket Lookup (M, R, B)**

Once the Net Chargeable Income ($P$) is determined, the system must determine the tax liability by querying the 2025 Tax Schedule. This involves retrieving three constants: $M$ (the floor of the income bracket), $R$ (the tax rate percentage), and $B$ (the base tax for the bracket). The 2025 tax landscape includes specific rate adjustments that must be reflected in the tax\_brackets database table.

**Table 1: 2025 PCB Tax Brackets and Constants**

| Chargeable Income Bracket (P) | Category Code | Floor (M) | Rate (R) | Base Tax (B) |
| :---- | :---- | :---- | :---- | :---- |
| RM 5,001 \- RM 20,000 | B | 5,000 | 1% | 0 |
| RM 20,001 \- RM 35,000 | C | 20,000 | 3% | 150 |
| RM 35,001 \- RM 50,000 | D | 35,000 | 8% | 600 |
| RM 50,001 \- RM 70,000 | E | 50,000 | 11% | 1,800 |
| RM 70,001 \- RM 100,000 | F | 70,000 | 19% | 4,000 |
| RM 100,001 \- RM 400,000 | G | 100,000 | 25% | 9,700 |
| RM 400,001 \- RM 600,000 | H | 400,000 | 26% | 84,700 |
| RM 600,001 \- RM 2,000,000 | I | 600,000 | 28% | 136,700 |
| Exceeding RM 2,000,000 | J | 2,000,000 | 30% | 528,700 |

Data Source Reference: 1

The calculation logic then applies the formula:

$$PCB\_{Total} \= \\frac{ \- Z \- X}{n+1}$$

Where $Z$ is Zakat paid via salary deduction, $X$ is the PCB already paid in previous months, and $n$ is the number of remaining months. The division by $n+1$ is the mechanism that smooths the tax liability over the remainder of the year, automatically adjusting for any under-payment or over-payment in previous months.

#### **1.1.4 Handling Edge Cases: Non-Residents and Special Regimes**

A robust payroll engine must handle the exceptions that standard calculators miss. The system requires a "Tax Status" flag in the employee profile.

* **Non-Resident Status:** For employees in Malaysia for less than 182 days, the $P, M, R, B$ logic is bypassed. Instead, a flat rate of **30%** is applied to the gross remuneration.1 The system must automatically track "Days in Country" if integrated with the attendance module to alert HR when an employee crosses the 182-day threshold, triggering a retroactive recalculation to Resident status (which often results in a tax refund).  
* **Returning Expert Program (REP):** Qualifying individuals under TalentCorp's REP are subject to a flat rate of **15%** for five consecutive years. This requires a tax\_regime\_override field in the database, linked to a validity period (Start Date to End Date).4  
* **Knowledge Workers (Iskandar/Special Regions):** Similar to REP, specific economic zones offer a 15% rate. The validation logic should cross-reference the company's registered address or the employee's work location against a list of qualifying postcodes.

### **1.2 The 2025 EPF Paradigm Shift: Foreign Worker Mandate**

Historically, EPF contributions were voluntary for non-Malaysian citizens. However, the Employees Provident Fund (Amendment) Bill 2025 introduces a mandatory contribution regime effective October 2025, fundamentally altering the cost structure for employers of foreign labor.7

#### **1.2.1 Integration of the Non-Citizen Mandate**

The system needs to implement a transition logic that activates in the October 2025 payroll run. The logic must evaluate three conditions: Citizenship, EPF Membership History, and Date.

1. **Standard Foreign Workers:** For non-citizens who are not existing EPF members, the system must force a new contribution rate of **2% Employer Share** and **2% Employee Share**.9 This rate applies to wages earned from October 2025 onwards. The payroll engine must have a "Compliance Trigger" date set to 01-10-2025.  
2. **Legacy Members:** A crucial exception exists for non-citizens who elected to contribute *before 1 August 1998*. These individuals are treated under the same rate structure as Malaysian citizens (Part A/C of the Third Schedule). The database must store the epf\_registration\_date and apply an IF date \< 1998-08-01 THEN use\_standard\_table ELSE use\_new\_2\_percent\_rule logic.10  
3. **Opt-in Logic:** The system must allow foreign workers to opt for contribution rates higher than the statutory 2%. This requires a "Voluntary Excess" field where the employee can specify a percentage (e.g., 11%) while the employer maintains the statutory 2% or matches the excess.11

#### **1.2.2 Domestic vs. Expatriate Nuance**

The mandate specifically excludes "domestic servants" (maids, cooks, etc.) unless they voluntarily opt-in.9 The employee master data must therefore include a job\_category classification. If job\_category \== 'DOMESTIC', the default EPF contribution should be 0% unless an opt\_in\_flag is set to TRUE. For all other foreign workers (expatriates, factory workers), the 2% is mandatory.

### **1.3 SOCSO and EIS: The RM6,000 Ceiling**

The Social Security Organisation (SOCSO/PERKESO) and the Employment Insurance System (EIS) have raised the wage ceiling for contributions from RM5,000 to **RM6,000**, effective late 2024 and continuing into 2025\.12

#### **1.3.1 Contribution Matrix Implementation**

The payroll engine should not use a simple percentage calculation for SOCSO because the contributions are determined by wage slabs (e.g., "Wages exceeding RM2,000 but not exceeding RM2,100"). The database must house a socso\_contribution\_schedule table.

* **The RM6,000 Cap:** For any employee earning \> RM6,000, the contribution is capped at the value for RM6,000. For Category 1 (Injury \+ Invalidity), the employer contributes approximately RM104.15 and the employee RM29.75.14 Hardcoding these caps is risky; the system should query the MAX(wage\_ceiling) from the configuration table.  
* **Age-Based Categorization:** The system must automatically switch employees from **Category 1** to **Category 2** (Employment Injury Scheme only) upon their 60th birthday. Category 2 requires only the Employer contribution (\~1.25%) and zero Employee contribution. The payroll\_run function must check: IF age \>= 60 THEN category \= 2 ELSE category \= 1\.15

### **1.4 Database Schema for Statutory Compliance**

To support this level of complexity, a normalized relational database schema is essential. The following Entity-Relationship (ER) logic is proposed:

* **employee\_statutory\_profile Table:**  
  * employee\_id (FK): Links to master data.  
  * epf\_number: String.  
  * epf\_status: Enum (MANDATORY, VOLUNTARY, ELECTIVE\_PRE\_1998).  
  * tax\_category: Enum (RESIDENT, NON\_RESIDENT, RETURNING\_EXPERT, ISKANDAR\_KNOWLEDGE).  
  * tax\_marital\_status: Enum (SINGLE, MARRIED\_JOINT, MARRIED\_SEPARATE).  
  * socso\_category: Integer (1 or 2).  
  * pcb\_accumulated\_prev\_employment: Decimal.  
* **statutory\_rates\_version Table:**  
  * id: PK.  
  * effective\_date: Date (e.g., 2025-01-01).  
  * module: Enum (PCB, EPF, SOCSO).  
  * rules\_json: JSONB. This column stores the variable constants (e.g., the M, R, B values for PCB or the wage slabs for SOCSO). Using a JSON blob allows the rules to be updated dynamically via a patch without altering the database schema structure.  
* **payroll\_ledger Table:**  
  * transaction\_id: PK.  
  * pay\_period: Date.  
  * gross\_normal: Decimal.  
  * gross\_additional: Decimal.  
  * calc\_pcb: Decimal.  
  * calc\_epf\_ee: Decimal (Employee Share).  
  * calc\_epf\_er: Decimal (Employer Share).  
  * calc\_socso\_category: Integer.  
  * formula\_trace: Text/JSON. (Stores the step-by-step derivation of the tax amount for audit purposes).

## **Module 2: Earned Wage Access (EWA) Liquidity Engine**

Earned Wage Access (EWA) transforms the payroll system from a passive record-keeping tool into an active financial wellness platform. In the Malaysian market, where a significant portion of the blue-collar workforce relies on predatory payday loans, EWA serves as a critical retention tool. However, the implementation must navigate the legal constraints of the Employment Act 1955 regarding "deductions from wages."

### **2.1 The "Safe Limit" Algorithmic Logic**

The primary risk in EWA is "over-advancement," where an employee withdraws funds that are legally required for statutory deductions or other fixed obligations. If an employee earning RM2,000 withdraws RM1,500 mid-month, the remaining RM500 may be insufficient to cover the EPF (RM220), SOCSO (RM30), PCB, and potentially unpaid leave deductions.

To mitigate this, the system must calculate the **Safe Withdrawable Amount ($W\_{safe}$)** in real-time using the following formula:

$$W\_{safe} \= (E\_{accrued} \\times F\_{buffer}) \- (D\_{stat\\\_projected} \+ D\_{lien})$$

1. **Accrued Earnings ($E\_{accrued}$):** This is not the monthly salary, but the salary earned *to date*.  
   * Formula: $\\frac{Monthly\\ Salary}{26} \\times Days\\ Worked$.  
   * Data Source: This requires a direct feed from the **Module 3 Attendance** system. If an employee has been absent for 2 days, $E\_{accrued}$ must reflect this reduction immediately to preventing an overdraft.  
2. **Safety Buffer ($F\_{buffer}$):** Section 24 of the Employment Act 1955 generally limits total deductions to 50% of wages.17 While EWA is technically an "advance" and not a "deduction" in some interpretations, conservative legal counsel recommends adhering to the 50% net cap to avoid constructive dismissal claims. Therefore, $F\_{buffer}$ should be set to **0.50** by default, configurable by the employer.  
3. **Projected Statutory Deductions ($D\_{stat\\\_projected}$):** The system must calculate EPF, SOCSO, and PCB based on the *full projected monthly salary*, not just the accrued amount. Statutory obligations are fixed based on the monthly contract; they do not scale down linearly mid-month.  
4. **Liens and Court Orders ($D\_{lien}$):** Any fixed deductions such as PTPTN repayments (via salary deduction) or court-ordered child support must be subtracted from the available liquidity.

### **2.2 Operational Tech Flow and API Architecture**

The EWA module operates as a bridge between the payroll ledger and the banking system. The architecture should support two funding models: **Employer-Funded** (using the company's balance sheet) and **Factor-Funded** (using a third-party fintech provider like Paywatch).

#### **2.2.1 The Request-Disbursement Cycle**

1. **User Request:** The employee triggers a request via the WhatsApp interface: "Withdraw RM50."  
2. **Validation Gate:** The backend calls the calculate\_safe\_limit() function.  
   * IF $Request\\\_Amount \\le W\_{safe}$: Proceed.  
   * ELSE: Return error "Insufficient accrued balance. Available: RM XX."  
3. **Transaction Creation:**  
   * Create a record in the ewa\_transactions table with status PENDING.  
   * Timestamp and geo-tag the request for fraud prevention.  
4. **Disbursement (The Fintech Layer):**  
   * The system executes a payout via a Payment Gateway API (e.g., Curlec, Razer, or a direct bank API like CIMB Gateway).  
   * *Payload:* {account\_number, bank\_code, amount, reference\_id}.  
   * Upon 200 OK from the gateway, update status to DISBURSED.  
5. **Ledger Reconciliation:**  
   * Debit: Account Receivable \- Staff Advances.  
   * Credit: Cash at Bank.

#### **2.2.2 The Payroll Settlement Loop**

At the end of the month, during the Final Payroll Run, the system must perform an automated reconciliation.

1. Query ewa\_transactions for all DISBURSED items within the pay\_period.  
2. Sum the total as Total\_Advance.  
3. Insert a line item into the Payslip Deductions: "Salary Advance / EWA".  
4. Net Pay \= Gross \- Statutory \- Total\_Advance.  
5. *Critical Check:* If Net Pay \< RM0 (due to unexpected unpaid leave after the advance was taken), the system must roll over the negative balance to the next month's opening\_balance as a debt, and flag the HR admin for manual review.

### **2.3 Legal Framework and "Wage" Definition**

It is vital to position EWA correctly in the legal documentation. The Terms of Service presented to the employee (via WhatsApp) must explicitly state that this is an **"Advance of Earned Wages"** and not a **"Loan."** This distinction exempts the transaction from the Moneylenders Act 1951\. Furthermore, the deduction from the final salary must be authorized in writing (digital signature via WhatsApp is acceptable under the Electronic Commerce Act 2006\) to comply with Section 24 of the Employment Act.18

## **Module 3: Attendance and Smart Rostering**

The integrity of the payroll system is contingent upon the veracity of the attendance data. In the Malaysian blue-collar context, time theft via "buddy punching" and GPS spoofing is a pervasive challenge.

### **3.1 Anti-Fraud Technology Stack**

The attendance module must employ a "Zero-Trust" architecture regarding location and identity.

#### **3.1.1 GPS Verification and Android Mock Location Defense**

Standard GPS checks are vulnerable to "Mock Location" applications widely available on the Play Store. The system must implement advanced detection logic, particularly for Android devices which are dominant in the target demographic.

* **Mock Location Detection:** For Android 12 and above, the deprecated Settings.Secure.ALLOW\_MOCK\_LOCATION is insufficient. The app must inspect the Location object properties. If location.isFromMockProvider() returns true, the clock-in must be rejected.19  
* **Entropy Analysis:** Spoofed GPS locations often have fixed coordinates or zero variance. Real GPS signals have "jitter." The system should analyze the last 5 location pings; if the variance is exactly zero, it is likely a spoofed static location.

#### **3.1.2 Wi-Fi BSSID Binding (The "Indoor GPS")**

GPS signals are often weak or inaccurate inside factories or malls. The most robust verification method is **Wi-Fi Binding**. The system binds the valid clock-in event to the specific MAC address (BSSID) of the workplace router.

* **Android 13 Permission Restrictions:** Accessing the BSSID (Basic Service Set Identifier) is restricted in Android 13+. The application manifest must explicitly request the NEARBY\_WIFI\_DEVICES permission and the user must grant it.20  
* **Implementation Logic:**  
  IF (Current\_BSSID IN Authorized\_Router\_List) THEN  
      Allow\_Clock\_In()  
  ELSE  
      Reject("Please connect to Office Wi-Fi")  
  END

This method effectively creates a hardware geofence that is extremely difficult to spoof without physical proximity to the router.21

#### **3.1.3 Passive Liveness Detection**

To prevent buddy punching (using a photo of a colleague), the system should utilize **Passive Liveness Detection**. Unlike "Active" liveness (which asks users to blink or turn their head, adding friction), passive liveness uses AI to analyze the texture, depth map, and micro-reflections of the selfie image to determine if it is a live 3D face or a 2D spoof.22 This can be implemented via third-party SDKs (e.g., Regula, FaceTec) integrated into the image capture flow.

### **3.2 Smart Rostering and Legal Limits**

The rostering engine must be a constraint-solver that optimizes schedules while adhering to the Employment Act 1955 (Amendment 2022).

* **Algorithm:** A **Constraint Satisfaction Problem (CSP)** solver is recommended. The algorithm treats the roster as a mathematical grid where it must place shifts ($S$) for employees ($E$) such that no constraints are violated.  
* **Hard Constraints (Legal Compliance):**  
  * **Maximum Hours:** No more than 45 hours of normal work per week.23  
  * **Overtime Cap:** Maximum 104 hours of OT per month. The system must lock an employee from being assigned OT if they have reached this threshold.23  
  * **Rest Days:** Mandatory 1 rest day per week.  
  * **Break Times:** No employee can work more than 5 consecutive hours without a break of at least 30 minutes. The rostering engine must auto-insert these break blocks.24  
* **Soft Constraints (Optimization):**  
  * Minimize gap hours between split shifts.  
  * Fair distribution of weekend shifts among staff.

## **Module 4: The WhatsApp-First Interface (UX & Tech)**

The defining market differentiator of this system is the elimination of the "Employee App." By leveraging WhatsApp, the system taps into an interface that has near-100% penetration in the Malaysian workforce, removing the friction of app downloads, updates, and forgotten passwords.

### **4.1 WhatsApp Business API (WABA) Architecture**

The backend connects to the **WhatsApp Cloud API** (hosted by Meta). This allows for high-throughput messaging and the use of interactive messages (Lists, Buttons) rather than just text.

#### **4.1.1 Identity Binding and Authentication**

Since WhatsApp accounts are tied to phone numbers, the system relies on **Phone Number Verification** as the primary identity link.

* **The "Binding" Flow:**  
  1. HR Admin enters the employee's phone number into the web portal.  
  2. The system sends a Template Message to that number: *"Welcome to \[Company\] HR. Tap below to verify your account."*  
  3. **Two-Factor Authentication (2FA):** Upon tapping the button, the user is prompted to enter a unique identifier (e.g., the last 4 digits of their IC or specific Employee ID).  
  4. The system validates this input against the master database. If successful, the whatsapp\_id (phone number) is permanently bound to the employee\_uuid in the database.  
  5. *Security Note:* If the employee changes their number, HR must reset the binding to prevent the old number (which might be recycled by the telco) from accessing personal data.

### **4.2 WhatsApp Flows (JSON-Driven UI)**

Meta's **WhatsApp Flows** feature allows developers to build native-like forms within the chat interface.25 This is superior to "chatbot" flows (text back-and-forth) which are error-prone.

* **Implementation:** The flow is defined in a JSON file uploaded to the Meta developer console.  
* **Use Case: Leave Application:**  
  * *Screen 1:* CalendarComponent for selecting Start Date and End Date.  
  * *Screen 2:* DropdownComponent for Leave Type (Annual, MC, Emergency).  
  * *Screen 3:* TextComponent for "Reason."  
  * *Data Exchange:* When the user hits "Submit," the flow sends a structured JSON payload to the webhook endpoint:  
    JSON  
    {  
      "flow\_token": "SESSION\_123",  
      "action": "LEAVE\_SUBMIT",  
      "payload": {  
        "start": "2025-05-01",  
        "end": "2025-05-02",  
        "type": "ANNUAL"  
      }  
    }

  * The backend processes this immediately, checks the leave balance, and returns a success message to the chat.

### **4.3 Secure Document Delivery (Payslips)**

Sending a raw PDF payslip via WhatsApp is a violation of data privacy principles (PDPA). The document must be encrypted.

* **Encryption Protocol:** The system generates the PDF (using a library like PDFKit or iText) and applies **AES-256 encryption**.  
* **Password Logic:** The password should be a standard convention known to the user but unique to them, such as DOB(DDMMYY) \+ Last 4 IC. This eliminates the need to transmit a password over the same channel as the document.27  
* **Delivery UX:** The user receives a message: *"Your January 2025 Payslip is ready."* along with the protected PDF file. They tap to open and are prompted by the OS (Android/iOS) to enter the password.

## **Module 5: Market Strategy and Competitive Analysis**

The Malaysian HR Tech market is crowded but stratified. Incumbents like PayrollPanda and Kakitangan have secured the "White Collar SME" market. The opportunity lies in the "Grey/Blue Collar" sector (Manufacturing, F\&B, Logistics), where the workforce is mobile-first and desktop-averse.

### **5.1 Competitor Landscape Deep Dive**

**PayrollPanda:**

* *Strengths:* Extremely user-friendly for admins, fast setup, strong bank integrations.29  
* *Weaknesses:* The employee mobile app is basic. It is priced for SMEs, making it expensive for high-turnover blue-collar firms. It lacks a native EWA module.

**Kakitangan:**

* *Strengths:* comprehensive HR suite (claims, benefits, performance). Strong brand equity.31  
* *Weaknesses:* The UI is notoriously complex ("clunky"). Support is tiered, with premium support costing extra. It can be "overkill" for simple payroll needs.

**Swingvy:**

* *Strengths:* Best-in-class UI design. Mobile app is very polished.  
* *Weaknesses:* Pricing is on the higher end. The focus is tech startups and modern SMEs, not factories.

### **5.2 The "Killer Feature": Zero-Friction Adoption**

The proposed system's unique value proposition (UVP) is **"The Invisible HR System."**

* **Pain Point:** Factory managers struggle to get 200 operators to download, install, and update a proprietary HR app. Phones run out of storage; passwords are forgotten daily.  
* **Solution:** By piggybacking on WhatsApp, adoption is instant. There is no learning curve. This dramatically reduces the administrative burden on HR to "tech support" their staff.

### **5.3 Pricing Strategy and Unit Economics**

To disrupt the market, the pricing must align with the low-margin nature of the target industries.

* **SaaS Fee:** RM 6 \- RM 8 per employee/month. This undercuts the standard RM 10-15 range of competitors.  
* **WhatsApp Conversation Costs:** Meta charges per 24-hour conversation window. The cost (approx RM 0.10 \- 0.30 per conversation) should be absorbed into the base fee or capped.  
* **EWA Revenue Stream:** This is the profit multiplier.  
  * *Transaction Fee Model:* Charge RM 5 per withdrawal (paid by employee). If 20% of a 1,000-person workforce withdraws twice a month, that is $1,000 \\times 0.2 \\times 2 \\times RM5 \= RM2,000$ in pure ancillary revenue/month, often exceeding the SaaS fee revenue.  
  * *Strategic Value:* Offering EWA increases employee retention, which is the \#1 metric for manufacturing HR. The system pays for itself by reducing recruitment costs.

## **Conclusion**

The development of this Malaysian HR, Payroll, and Attendance system represents a complex intersection of software engineering, legal compliance, and behavioral psychology. The technical core must be rigid and rigorous—capable of executing the 2025 PCB algorithms and EPF mandates with zero error. Conversely, the user interface must be fluid and forgiving, meeting the employee where they already are: on WhatsApp.

By fusing a **Compliance-First Payroll Engine** (handling the Non-Citizen EPF and RM6k SOCSO cap) with a **Risk-Managed Liquidity Tool** (EWA), the system addresses the two most pressing needs of the modern Malaysian employer: regulatory safety and workforce retention. The implementation of the **Smart Rostering** and **Anti-Fraud Attendance** modules further solidifies the business case by plugging operational leakages.

This blueprint provides the comprehensive roadmap for building a platform that is not just another payroll software, but a critical infrastructure layer for the Malaysian economy's digitized future.

#### **Works cited**

1. AMENDMENT TO: SPECIFICATION FOR MONTHLY TAX ..., accessed December 16, 2025, [https://www.hasil.gov.my/media/mdahzjwi/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2025.pdf](https://www.hasil.gov.my/media/mdahzjwi/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2025.pdf)  
2. AMENDMENT TO: SPECIFICATION FOR MONTHLY TAX DEDUCTION (MTD) CALCULATIONS USING COMPUTERISED CALCULATION FOR \- Lembaga Hasil Dalam Negeri Malaysia, accessed December 16, 2025, [https://phl.hasil.gov.my/pdf/pdfam/Spesifikasi\_Kaedah\_Pengiraan\_Berkomputer\_PCB\_2022.pdf](https://phl.hasil.gov.my/pdf/pdfam/Spesifikasi_Kaedah_Pengiraan_Berkomputer_PCB_2022.pdf)  
3. PCB/MTD Tax Deduction Guide: Everything You Need to Know 2025, accessed December 16, 2025, [https://pcbcalculator.my/blog/pcb-monthly-tax-deduction-guide](https://pcbcalculator.my/blog/pcb-monthly-tax-deduction-guide)  
4. Personal income tax \- PwC, accessed December 16, 2025, [https://www.pwc.com/my/en/publications/mtb/personal-income-tax.html](https://www.pwc.com/my/en/publications/mtb/personal-income-tax.html)  
5. Tax Rate | Lembaga Hasil Dalam Negeri Malaysia, accessed December 16, 2025, [https://www.hasil.gov.my/en/individual/individual-life-cycle/income-declaration/tax-rate/](https://www.hasil.gov.my/en/individual/individual-life-cycle/income-declaration/tax-rate/)  
6. AMENDMENT TO: SPECIFICATION FOR MONTHLY TAX DEDUCTION (MTD) CALCULATIONS USING COMPUTERISED CALCULATION FOR, accessed December 16, 2025, [https://www.hasil.gov.my/media/hgifbzzy/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2024.pdf](https://www.hasil.gov.my/media/hgifbzzy/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2024.pdf)  
7. Complete Guide to Non-Malaysian Employees EPF Contributions (Effective 1 October 2025), accessed December 16, 2025, [https://cwics.com.my/2025/09/30/complete-guide-to-non-malaysian-employees-epf-contributions-effective-1-october-2025/](https://cwics.com.my/2025/09/30/complete-guide-to-non-malaysian-employees-epf-contributions-effective-1-october-2025/)  
8. EPF Begins Mandatory Contributions For Non-Malaysian Citizen Employees Effective October 2025 \- KWSP Malaysia, accessed December 16, 2025, [https://www.kwsp.gov.my/en/w/news/epf-begins-mandatory-contributions-for-non-malaysian-citizen-employees-effective-october-2025](https://www.kwsp.gov.my/en/w/news/epf-begins-mandatory-contributions-for-non-malaysian-citizen-employees-effective-october-2025)  
9. Malaysia introduces mandatory EPF contributions for foreign employees \- Lockton, accessed December 16, 2025, [https://global.lockton.com/us/en/news-insights/malaysia-introduces-mandatory-epf-contributions-for-foreign-employees](https://global.lockton.com/us/en/news-insights/malaysia-introduces-mandatory-epf-contributions-for-foreign-employees)  
10. Contribution For Non-Malaysian Citizen Employees \- KWSP Malaysia \- EPF, accessed December 16, 2025, [https://www.kwsp.gov.my/en/employer/responsibilities/non-malaysian-citizen-employees](https://www.kwsp.gov.my/en/employer/responsibilities/non-malaysian-citizen-employees)  
11. New EPF contribution rate of non-malaysian in 2025, accessed December 16, 2025, [https://blog.kakitangan.com/new-epf-contribution-rate-of-non-malaysian-in-2025/](https://blog.kakitangan.com/new-epf-contribution-rate-of-non-malaysian-in-2025/)  
12. SOCSO Insured Salary Ceiling Raised from RM5,000 to RM6,000 (Effective from 1st October 2024\) \- Pandahrms, accessed December 16, 2025, [https://pandahrms.com/socso-insured-salary-ceiling-raised-from-rm5000-to-rm6000-effective-from-1st-october-2024/](https://pandahrms.com/socso-insured-salary-ceiling-raised-from-rm5000-to-rm6000-effective-from-1st-october-2024/)  
13. The Salary Ceiling for Contributions Has Now Increased to RM6,000 \- HHQ, accessed December 16, 2025, [https://hhq.com.my/posts/the-salary-ceiling-for-contributions-has-now-increased-to-rm6000/](https://hhq.com.my/posts/the-salary-ceiling-for-contributions-has-now-increased-to-rm6000/)  
14. AMENDMENT TO: SPECIFICATION FOR MONTHLY TAX DEDUCTION (MTD) CALCULATIONS USING COMPUTERISED CALCULATION FOR \- Lembaga Hasil Dalam Negeri Malaysia, accessed December 16, 2025, [https://www.hasil.gov.my/media/4lvjatuy/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2023.pdf](https://www.hasil.gov.my/media/4lvjatuy/spesifikasi-kaedah-pengiraan-berkomputer-pcb-2023.pdf)  
15. Contributions \- Perkeso, accessed December 16, 2025, [https://www.perkeso.gov.my/en/our-services/employer-employee/contributions.html](https://www.perkeso.gov.my/en/our-services/employer-employee/contributions.html)  
16. Latest SOCSO Contribution Table: Calculate Your 2025 Rates, accessed December 16, 2025, [https://quickhr.my/resources/blog/socso-contribution-table](https://quickhr.my/resources/blog/socso-contribution-table)  
17. Earned Wage Access and the CFPB: A Path Toward Regulatory Acceptance?, accessed December 16, 2025, [https://www.americanbar.org/groups/business\_law/resources/business-law-today/2021-march/earned-wage-access/](https://www.americanbar.org/groups/business_law/resources/business-law-today/2021-march/earned-wage-access/)  
18. Is Earned Wage Access the Way of The Future? 5 Tips for Employers Seeking to Attract and Retain Talent Through On-Demand Pay | Fisher Phillips, accessed December 16, 2025, [https://www.fisherphillips.com/en/news-insights/earned-wage-access-tips-for-employers-seeking-to-attract-retain-talent.html](https://www.fisherphillips.com/en/news-insights/earned-wage-access-tips-for-employers-seeking-to-attract-retain-talent.html)  
19. android \- Disable / Check for Mock Location (prevent gps spoofing) \- Stack Overflow, accessed December 16, 2025, [https://stackoverflow.com/questions/6880232/disable-check-for-mock-location-prevent-gps-spoofing](https://stackoverflow.com/questions/6880232/disable-check-for-mock-location-prevent-gps-spoofing)  
20. Request permission to access nearby Wi-Fi devices | Connectivity \- Android Developers, accessed December 16, 2025, [https://developer.android.com/develop/connectivity/wifi/wifi-permissions](https://developer.android.com/develop/connectivity/wifi/wifi-permissions)  
21. Get Wifi Information Programmatically in Android | by Scott \- Medium, accessed December 16, 2025, [https://medium.com/@copy2sim/get-wifi-information-programmatically-in-android-dbcb09d08f09](https://medium.com/@copy2sim/get-wifi-information-programmatically-in-android-dbcb09d08f09)  
22. What Is Liveness Detection? Types and Benefits \- Regula Forensics, accessed December 16, 2025, [https://regulaforensics.com/blog/liveness-detection/](https://regulaforensics.com/blog/liveness-detection/)  
23. Working Hours Malaysia 2025 \- Employment Act, Overtime & Rights \- Central HR, accessed December 16, 2025, [https://www.centralhr.my/understanding-working-hours-in-malaysia/](https://www.centralhr.my/understanding-working-hours-in-malaysia/)  
24. How to Calculate Overtime Pay Rate in Malaysia \[2025 Guide\] \- Links International, accessed December 16, 2025, [https://linksinternational.com/blog/guide-to-calculating-overtime-pay-for-employees-in-malaysia/](https://linksinternational.com/blog/guide-to-calculating-overtime-pay-for-employees-in-malaysia/)  
25. Flows API \- WhatsApp Flows \- Meta for Developers \- Facebook, accessed December 16, 2025, [https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi/](https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi/)  
26. WhatsApp Flows \- Meta for Developers, accessed December 16, 2025, [https://developers.facebook.com/docs/whatsapp/flows/](https://developers.facebook.com/docs/whatsapp/flows/)  
27. How to Securely Send PDF Documents via WhatsApp | Enhance Privacy with VeryPDF DRM Protector, accessed December 16, 2025, [https://drm.verypdf.com/how-to-securely-send-pdf-documents-via-whatsapp-enhance-privacy-with-verypdf-drm-protector/](https://drm.verypdf.com/how-to-securely-send-pdf-documents-via-whatsapp-enhance-privacy-with-verypdf-drm-protector/)  
28. Are password protected payslips a 'quick fix'? \- IRIS Software, accessed December 16, 2025, [https://www.iris.co.uk/blog/payroll/https-www-iris-co-uk-blog-payroll-password-protected-payslips/](https://www.iris.co.uk/blog/payroll/https-www-iris-co-uk-blog-payroll-password-protected-payslips/)  
29. What Are The Best 7 Payroll Software In Malaysia In 2025? | ByteHR, accessed December 16, 2025, [https://byte-hr.com/my/blog/payroll-software-malaysia](https://byte-hr.com/my/blog/payroll-software-malaysia)  
30. 6 Best Payroll Management Systems | 2025 \- PayrollPanda, accessed December 16, 2025, [https://www.payrollpanda.my/best-software/payroll-management-systems/](https://www.payrollpanda.my/best-software/payroll-management-systems/)  
31. Payrollpanda Vs Kakitangan: Which Is Best For Your Business In Malaysia? | ByteHR, accessed December 16, 2025, [https://byte-hr.com/my/blog/payrollpanda-vs-kakitangan](https://byte-hr.com/my/blog/payrollpanda-vs-kakitangan)  
32. Honest review of Kakitangan (2025) \- PayrollPanda, accessed December 16, 2025, [https://www.payrollpanda.my/reviews/kakitangan/](https://www.payrollpanda.my/reviews/kakitangan/)