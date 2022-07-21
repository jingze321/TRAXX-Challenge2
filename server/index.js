const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const bcrypt = require("bcrypt")

var cors = require('cors')
const corsOptions ={
    origin:'http://localhost:3000',
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
    cookie:{
        expires:60*60*24,
    }
}))


const mysql = require('mysql');
// const db = mysql.createPool({
//     host:'localhost',
//     user:'root',
//     password:'root',
//     database:'dev-challenge',
// })
var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database:'dev-challenge',
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
        console.log(result,'result',result.length);

        if (result.length>0){
            bcrypt.compare(password,result[0].password,(error,response)=>{
                console.log(response,'response');
                if(response){
                    req.session.user= result;
                    res.send(result);
                }else{
                    res.send({message:"Wrong password"});
                }
            })
        }else{
            res.send({message:"User doesn't exist"});
        }

    })
    // res.send("1234",username,req);

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
        console.log(isnertQuery1);
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
            
    
    console.log(deleteQuery1);
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
        console.log(result);

        res.status(200).send({result});
    })
});

app.get("/api/currency/get-exist-currency",(req,res)=>{
    const query = `SELECT DISTINCT ${req.query.column} FROM currency;`

    db.query(query,(err,result)=>{
        if (err){
            res.send({err:err});
        }
        console.log(result);

        res.status(200).send({result});
    })
});

app.get("/api/currency/get-rate",(req,res)=>{
    const query = `SELECT * FROM currency WHERE base='${req.query.base}' AND counter='${req.query.counter}';`
    console.log(query);
    db.query(query,(err,result)=>{
        if (err){
            res.send({err:err});
        }
        // const firstResult=result[0];
        res.status(200).send({result});
    })
});

app.listen(4000,()=>{
    console.log('running on port 4000');
    db.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");
      });
});
