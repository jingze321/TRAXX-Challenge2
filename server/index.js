const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

require('dotenv').config();

const bcrypt = require("bcrypt")    //password before:123123 after:$2a$10$qUFEXe4.mj5D8zCv7eV0K.MG8GuWEMVCUdHmameZ6DBLzg8IQewTu
                                    //https://bcrypt-generator.com/   
                                    // Create encrypt password here and save into user database
var cors = require('cors')
const corsOptions ={
    origin: process.env.REACT_APP_FRONTEND_URL??'http://localhost:3000',
    methods:["GET","POST"], 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}

app.use(cors(corsOptions)) // Use this after the variable declaration
app.use(express.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use(cookieParser())
app.use(session({
    key:"userId",
    secret:"helloworld",
    resave:false,
    saveUninitialized:false,
    rolling: true,
    cookie: { 
        maxAge: 7 * 24 * 3600 * 1000,
      },
}))


const mysql = require('mysql');

var db = mysql.createConnection({
    host: process.env.REACT_APP_DATABASE_HOST??"localhost",
    user: process.env.REACT_APP_DATABASE_USER??"root",
    password: process.env.REACT_APP_DATABASE_PASSWORD??"",
    database:process.env.REACT_APP_DATABASE_DATABASE??'dev-challenge',
  });


app.get("/",(req,res)=>{
    const sqlInsert= "INSERT INTO currency (base, counter, rate) VALUES ('MYR', 'SGD', 3.2)";
    db.query(sqlInsert,(err,result)=>{
        res.send(err);
    })
    res.send("test");

})

app.get("/api/login",(req,res)=>{
    if(req.session.user){
        res.send({loggedIn:true,user:req.session.user})
    }else{
        res.send({loggedIn:false,user:null})
    }

})


app.post("/api/login",(req,res)=>{
    const username = "'"+req.body.username+"'";
    const password = req.body.password;

    const sqlInsert= `SELECT * FROM user WHERE username=${username}`;
    db.query(sqlInsert,(err,result)=>{

        if (err){
            res.send({err:err});
        }

        if (result.length>0){
            bcrypt.compare(password,result[0].password,(error,response)=>{
                if(response){
                    req.session.user= result;
                    res.send(result);
                }else{
                    res.send({message:"Wrong password (Noted: Password encrypt bcrypt with Rounds 10)"}); 
                }
            })
        }else{
            res.send({message:"User doesn't exist"});
        }

    })

})

app.post("/api/logout",(req,res)=>{
    req.session.destroy();
    res.send({status:200});
})

app.post("/api/currency/add",(req,res)=>{
    const findExistQuery = `SELECT * FROM currency WHERE base='${req.body.base}' AND counter='${req.body.counter}'`;
    db.query(findExistQuery,(err,result)=>{
        if (err){
            res.send({err:err});
        }

        if (result.length>0){
            res.send({message:"Data Exist"});
        }else{
        const rate = Number.parseFloat(req.body.rate).toFixed(5);
        const isnertQuery = 
            `INSERT INTO currency (base, counter, rate) VALUES 
            ('${req.body.base}', '${req.body.counter}', '${rate}'),
            ('${req.body.counter}', '${req.body.base}', '${1/rate}');`
            db.query(isnertQuery,(err,addedResult)=>{
                if (err){
                    res.send({err:err});
                }
                res.status(200).send({addedResult});
            })
        }
    })
})


app.post("/api/currency/save",(req,res)=>{

        const rate1 = Number.parseFloat(req.body.rate).toFixed(5);
        const rate2 = (1/Number.parseFloat(req.body.rate)).toFixed(5);
        
        const isnertQuery1 = 
            `UPDATE currency SET rate='${rate1}' WHERE base='${req.body.base}' AND counter='${req.body.counter}'`;
                
        
        const isnertQuery2 = 
            `UPDATE currency SET rate='${rate2}' WHERE base='${req.body.counter}' AND counter='${req.body.base}'`;
            db.query(isnertQuery1,(err,result1)=>{
                if (err) throw err;
                db.query(isnertQuery2,(err,result2)=>{
                    if (err) throw err;

                    res.status(200).send({message:"Successful"});
                });
            });
})

app.post("/api/currency/delete",(req,res)=>{

    
    const deleteQuery1 = 
        `Delete FROM currency WHERE (base='${req.body.base}' AND counter='${req.body.counter}') OR (base='${req.body.counter}' AND counter='${req.body.base}')`;
            
    
        db.query(deleteQuery1,(err,result1)=>{
            if (err) throw err;
                res.status(200).send({message:"Successful"});
        });
})

app.get("/api/currency/find-base",(req,res)=>{
    const query = `SELECT * FROM currency WHERE base='${req.query.base}';`

    db.query(query,(err,result)=>{
        if (err){
            res.send({err:err});
        }

        res.status(200).send({result});
    })
});

app.get("/api/currency/get-exist-currency",(req,res)=>{
    const query = `SELECT DISTINCT ${req.query.column} FROM currency;`

    db.query(query,(err,result)=>{
        if (err){
            res.send({err:err});
        }

        res.status(200).send({result});
    })
});

app.get("/api/currency/get-rate",(req,res)=>{
    const query = `SELECT * FROM currency WHERE base='${req.query.base}' AND counter='${req.query.counter}';`
    db.query(query,(err,result)=>{
        if (err){
            res.send({err:err});
        }
        // const firstResult=result[0];
        res.status(200).send({result});
    })
});

app.listen(process.env.REACT_APP_SERVER_PORT??4000,()=>{
    console.log(`running on port ${process.env.REACT_APP_SERVER_PORT}`);
    db.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");
      });
});
