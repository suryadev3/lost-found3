/**
 * Official student list for Computer Hardware Engineering - CHE (2024-2027 Batch)
 * Register Number → { roll_no, name }
 */

const STUDENTS = {
  "2401150517": { roll_no: 1,  name: "ABHIJITH P V" },
  "2401150518": { roll_no: 2,  name: "ABHINANDHU P J" },
  "2401150519": { roll_no: 3,  name: "ABHINAV A S" },
  "2401150520": { roll_no: 4,  name: "ABIN M J" },
  "2401150521": { roll_no: 5,  name: "ABINAV BABU" },
  "2401150523": { roll_no: 6,  name: "AJITH C" },
  "2401150524": { roll_no: 7,  name: "ALBI P S" },
  "2401150525": { roll_no: 8,  name: "ALFIN P J" },
  "2401150526": { roll_no: 9,  name: "ANSIL S" },
  "2401150528": { roll_no: 10, name: "ARAVIND U R" },
  "2401150529": { roll_no: 11, name: "ARJUN KRISHNA P S" },
  "2401150530": { roll_no: 12, name: "ASWATHY B S" },
  "2401150531": { roll_no: 13, name: "ASWIN K V" },
  "2401150534": { roll_no: 14, name: "JOVAN SOLOMON JOY" },
  "2401150535": { roll_no: 15, name: "MANOJ KUMAR M" },
  "2401150538": { roll_no: 16, name: "MUHAMMAD ASHIK" },
  "2401150539": { roll_no: 17, name: "MUHAMMAD SINAN A Y" },
  "2401150540": { roll_no: 18, name: "MUHAMMED ANSHIL K S" },
  "2401150541": { roll_no: 19, name: "MUHAMMED LABEEB K M" },
  "2401150542": { roll_no: 20, name: "MUHAMMED SHAMEEM F" },
  "2401150544": { roll_no: 21, name: "NIDHIN N" },
  "2401150547": { roll_no: 22, name: "NIRANJAN K S" },
  "2401150549": { roll_no: 23, name: "RAHUL C" },
  "2401150550": { roll_no: 24, name: "RAMZAN N C" },
  "2401150552": { roll_no: 25, name: "RINZIYA P A" },
  "2401150556": { roll_no: 26, name: "SAJINMADHAV K S" },
  "2401150557": { roll_no: 27, name: "SANGEETHI P M" },
  "2401150558": { roll_no: 28, name: "SAYOOJ GEO" },
  "2401150561": { roll_no: 29, name: "SHOVAN SAMANTA" },
  "2401150562": { roll_no: 30, name: "SIDHARTHI P S" },
  "2401150564": { roll_no: 31, name: "SREEHARI K" },
  "2401150565": { roll_no: 32, name: "STELAN N T" },
  "2401150569": { roll_no: 33, name: "VIGNESH V" },
  "2401150571": { roll_no: 34, name: "VISHNU KRISHNAN" },
  "2401150723": { roll_no: 35, name: "ABHINANDH K" },
  "2401150724": { roll_no: 36, name: "AZEEM FIRAS P" },
  "2401150725": { roll_no: 37, name: "FARSHAD T M" },
  "2401150726": { roll_no: 38, name: "HRISHIKESH K P" },
  "2401150727": { roll_no: 39, name: "MUHAMMED AMEEN P P" },
  "2401150728": { roll_no: 40, name: "MUHSIN K M" },
  "2401150729": { roll_no: 41, name: "SREEKUTTAN AR" },
  "2401150731": { roll_no: 43, name: "SURYADEV I U" },
  "2401150732": { roll_no: 44, name: "VISWANATHAN K" }
};

function findStudent(registerNo) {
  if (!registerNo) return null;
  const key = String(registerNo).trim();
  return STUDENTS[key] || null;
}

function getAllStudents() {
  return Object.entries(STUDENTS).map(([register_no, data]) => ({
    register_no,
    roll_no: data.roll_no,
    name: data.name
  }));
}

module.exports = { findStudent, getAllStudents, STUDENTS };
