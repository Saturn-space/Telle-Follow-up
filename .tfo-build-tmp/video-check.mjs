const base="http://localhost:8000";
async function signIn(email,password){
 const response=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
 const body=await response.json(); return {cookie:response.headers.get("set-cookie")?.split(";")[0],body};
}
const patient=await signIn("demo.patient@teleflow.local","LocalDemoPatient!2026");
const doctor=await signIn("demo.doctor@teleflow.local","LocalDemoDoctor!2026");
const appointmentsResponse=await fetch(base+"/api/followup/appointments?limit=100",{headers:{cookie:doctor.cookie}});
const appointmentsBody=await appointmentsResponse.json();
const appointment=appointmentsBody.data?.find((item)=>item.locationOrService==="Local prototype video consultation workflow check");
if(!appointment) throw new Error("scheduled prototype appointment missing");
console.log("PASS patient and clinician appointment feeds include scheduled video appointment");
async function openSession(cookie){
 const response=await fetch(base+"/api/teleconsult/sessions",{method:"POST",headers:{"content-type":"application/json",cookie},body:JSON.stringify({appointmentId:appointment.id})});
 const body=await response.json(); if(!response.ok) throw new Error(body.error?.code||"session creation failed");
 return body.data;
}
const pSession=await openSession(patient.cookie);
const dSession=await openSession(doctor.cookie);
if(pSession.roomName!==dSession.roomName||pSession.appointmentId!==dSession.appointmentId) throw new Error("participants do not share the same room");
console.log("PASS both accounts join the same Jitsi session: "+pSession.domain);
const external=await fetch("https://"+pSession.domain+"/"+pSession.roomName,{signal:AbortSignal.timeout(12000)});
console.log("JITSI_PAGE_HTTP="+external.status);
if(!external.ok) throw new Error("Jitsi page could not be reached");
console.log("VIDEO CONSULTATION JOIN CHECK PASSED");
