const express = require("express")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const path = require("path")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname,"assignmentRecord.db")

let db = null

const initialzeDBandServer = async() => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log("server is running at port 3000")
        })
    }
    catch(e){
        console.log(`DB Error: ${e.message}`)
        process.exit(1)
    }
}

initialzeDBandServer()


app.post("/register/", async (request, response) => {
    const id = 1
    const name="prathap"
    const password = "prathap@2021"
    const getUserQuery = `
      SELECT * FROM user WHERE name = '${name}';
    `;
    const dbUser = await db.get(getUserQuery);
    if (dbUser === undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `
      INSERT INTO user(id, name, password)
      VALUES(
          ${id},
          '${name}',
          '${hashedPassword}',
      );
    `;
      const dbResponse = await db.run(addUserQuery);
      response.send("New User Created");
      console.log("user created")
    } else {
      response.status(400);
      response.send("Invalid username");
      console.log("username already exist")
    }
});


app.post("/login/", async (request, response) => {
const { username, password } = request.body;
const getUserQuery = `
    SELECT * FROM user WHERE name = '${username}';
`;
const dbUser = await db.get(getUserQuery);
if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
} else {
    const isPasswordTrue = await bcrypt.compare(password, dbUser.password);
    if (isPasswordTrue) {
    const payload = { name: username };
    const jwtToken = jwt.sign(payload, "prathap-token");
    response.send({ jwtToken });
    } else {
    response.status(400);
    response.send("Invalid password");
    }
}
});

 
const authenticateToken = (request, response, next) => {
let jwtToken;
const authHeader = request.headers["authorization"];
if (authHeader != undefined) {
    jwtToken = authHeader.split(" ")[1];
}
if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
} else {
    jwt.verify(jwtToken, "prathap-token", async (error, payload) => {
    if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
    } else {
        request.username = payload.name;
        next();
        }
    });
  }
};

const createRecord = async(item) => {
const {user_id, id, title, body} = item
const createRecord = `
    INSERT INTO record(id, title, body, user_id)
    values(${id},'${title}', '${body}', ${user_id});
`;
await db.run(createRecord)
}
  
app.post("/records/", authenticateToken, async(request, response)=>{
    const {content} = request.body

    for (let item of content){
        createRecord(item)
    }
    response.status(200)

})

app.get("/records/", authenticateToken, async(request, response) => {
    let {name} = request
    const selectUserQuery = `SELECT * FROM user WHERE name = '${name}'`;
    const userObject = await db.get(selectUserQuery);
    const getRecordsOfUserQuery = `
    SELECT * FROM record WHERE user_id = ${userObject.id}
    `;
    const records = await db.all(getRecordsOfUserQuery)
    response.send(records)
})

module.exports = app;
