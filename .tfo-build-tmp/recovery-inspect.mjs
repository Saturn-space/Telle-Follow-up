const base = "http://localhost:8000";
const response = await fetch(base + "/api/auth/login", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"demo.patient@teleflow.local",password:"LocalDemoPatient!2026"})});
const login = await response.json();
const cookie = response.headers.get("set-cookie")?.split(";")[0];
const url = base + "/api/patients/" + encodeURIComponent(login.data.user.patientId) + "/recovery-logs?limit=3";
const rowsResponse = await fetch(url,{headers:{cookie}});
const rows = await rowsResponse.json();
const newest = rows.data?.[0];
console.log(JSON.stringify({http:rowsResponse.status,rowCount:rows.data?.length,newestKeys:newest?Object.keys(newest):[],assessmentCount:newest?.riskAssessments?.length,latestAssessment:newest?.riskAssessments?.[0]?{engine:newest.riskAssessments[0].engine,reviewStatus:newest.riskAssessments[0].reviewStatus}:null}));
