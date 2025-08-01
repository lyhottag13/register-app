@echo OFF

CALL npm ci
set /p host=What's the host IP? 
set /p user=What's the user? 
set /p password=What's the password? 
set /p database=What's the database? 

echo import { createPool } from "mysql2/promise";  >  src\db.js
echo const pool = createPool({                     >> src\db.js
echo     host: '%host%',                           >> src\db.js
echo     user: '%user%',                           >> src\db.js
echo     password: '%password%',                   >> src\db.js
echo     database: '%database%'                    >> src\db.js
echo });                                           >> src\db.js
echo export default pool;                          >> src\db.js

set /p port=What's the desired localhost port? 

echo export default %port%; > src\port.js

echo ^<?xml version="1.0" encoding="UTF-8"?^> > web.config
echo ^<configuration^> >> web.config
echo   ^<system.webServer^> >> web.config
echo     ^<rewrite^> >> web.config
echo       ^<rules^> >> web.config
echo         ^<rule name="ReverseProxyInboundRule1" stopProcessing="true"^> >> web.config
echo           ^<match url="(.*)" /^> >> web.config
echo           ^<action type="Rewrite" url="http://localhost:%port%/{R:1}" /^> >> web.config
echo         ^</rule^> >> web.config
echo       ^</rules^> >> web.config
echo     ^</rewrite^> >> web.config
echo   ^</system.webServer^> >> web.config
echo ^</configuration^> >> web.config