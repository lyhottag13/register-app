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

CALL pm2 delete register
CALL pm2 start server.js --name register
CALL pm2 save
echo Successful setup.
PAUSE