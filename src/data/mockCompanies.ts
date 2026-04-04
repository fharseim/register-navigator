export interface Company {
  id: string;
  name: string;
  city: string;
  court: string;
  registerNumber: string;
  registerType: "HRB" | "HRA" | "GnR" | "PR" | "VR";
  status: "aktiv" | "aufgelöst" | "gelöscht" | "in Liquidation" | "Insolvenz eröffnet";
}

export interface RegisterDocument {
  id: string;
  type: "AD" | "CD" | "GV" | "GL" | "JA" | "BK" | "SI";
  label: string;
  date: string;
  meta?: string;
  subDocuments?: { id: string; label: string; date: string }[];
}

export const mockCompanies: Company[] = [
  { id: "1", name: "Project A Ventures GmbH & Co. KG", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRA 55927 B", registerType: "HRA", status: "aktiv" },
  { id: "2", name: "Project A Services GmbH & Co. KG", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRA 52241 B", registerType: "HRA", status: "aktiv" },
  { id: "3", name: "Project A Verwaltungs GmbH", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 168498 B", registerType: "HRB", status: "aktiv" },
  { id: "4", name: "Project A Management GmbH", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 160635 B", registerType: "HRB", status: "aktiv" },
  { id: "5", name: "Holtzbrinck Ventures GmbH", city: "München", court: "AG München", registerNumber: "HRB 202344", registerType: "HRB", status: "aktiv" },
  { id: "6", name: "HV Capital GmbH & Co. KG", city: "München", court: "AG München", registerNumber: "HRA 101289", registerType: "HRA", status: "aktiv" },
  { id: "7", name: "Earlybird Venture Capital GmbH & Co. KG", city: "München", court: "AG München", registerNumber: "HRA 89456", registerType: "HRA", status: "aktiv" },
  { id: "8", name: "Rocket Internet SE", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 165662 B", registerType: "HRB", status: "aktiv" },
  { id: "9", name: "N26 GmbH", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 177479 B", registerType: "HRB", status: "aktiv" },
  { id: "10", name: "FlixMobility GmbH", city: "München", court: "AG München", registerNumber: "HRB 197620", registerType: "HRB", status: "aktiv" },
  { id: "11", name: "Celonis SE", city: "München", court: "AG München", registerNumber: "HRB 238327", registerType: "HRB", status: "aktiv" },
  { id: "12", name: "Personio SE & Co. KG", city: "München", court: "AG München", registerNumber: "HRA 110055", registerType: "HRA", status: "aktiv" },
  { id: "13", name: "Trade Republic Bank GmbH", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 205340 B", registerType: "HRB", status: "aktiv" },
  { id: "14", name: "Wefox Holding AG", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 215788 B", registerType: "HRB", status: "in Liquidation" },
  { id: "15", name: "Gorillas Technologies GmbH", city: "Berlin", court: "AG Charlottenburg", registerNumber: "HRB 218765 B", registerType: "HRB", status: "gelöscht" },
];

export function getDocumentsForCompany(_companyId: string): RegisterDocument[] {
  return [
    { id: "ad1", type: "AD", label: "Aktueller Abdruck (AD)", date: "2026-01-15", meta: "Letzte Eintragung: 15.01.2026" },
    { id: "cd1", type: "CD", label: "Chronologischer Abdruck (CD)", date: "2026-01-15", meta: "23 Eintragungen" },
    {
      id: "gv1", type: "GV", label: "Gesellschaftsvertrag / Satzung", date: "2024-03-12", meta: "3 Fassungen",
      subDocuments: [
        { id: "gv1a", label: "Fassung vom 12.03.2024 (aktuell)", date: "2024-03-12" },
        { id: "gv1b", label: "Änderungsbeschluss vom 08.11.2022", date: "2022-11-08" },
        { id: "gv1c", label: "Gründungsurkunde vom 01.06.2012", date: "2012-06-01" },
      ],
    },
    {
      id: "gl1", type: "GL", label: "Gesellschafterliste", date: "2025-09-22", meta: "8 Versionen",
      subDocuments: [
        { id: "gl1a", label: "Liste Nr. 8 vom 22.09.2025 (aktuell)", date: "2025-09-22" },
        { id: "gl1b", label: "Liste Nr. 7 vom 15.04.2024", date: "2024-04-15" },
        { id: "gl1c", label: "Liste Nr. 6 vom 03.01.2023", date: "2023-01-03" },
        { id: "gl1d", label: "Liste Nr. 5 vom 18.07.2022", date: "2022-07-18" },
        { id: "gl1e", label: "Liste Nr. 4 vom 02.03.2021", date: "2021-03-02" },
      ],
    },
  ];
}
