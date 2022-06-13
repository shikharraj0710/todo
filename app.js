const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require('mongoose');
const _ = require("lodash");

const app = express();
mongoose.connect("mongodb+srv://shikhar:shikhar@cluster0.kzookdj.mongodb.net/todoListDB");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const workItems = [];

const itemsSchema = new mongoose.Schema(
    { 
        name : String
    }
)
 
const itemsModel = mongoose.model("Todo", itemsSchema);

const item1 = new itemsModel(
    {
        name : "Drink Water"
    }
)
const item2 = new itemsModel(
    {
        name : "Eat Ice Cream"
    }
)
const item3 = new itemsModel(
    {
        name : "Chocolate Day"
    }
)

const newItemsSchema = new mongoose.Schema(
    {
        name : String,
        newItemList : [itemsSchema] 
    }
) 

const newItemsModel = mongoose.model("Newlist", newItemsSchema);

const defaultItems = [item1, item2, item3];

app.get("/", function(req, res) {  
    console.log(req.params.name)
    if (req.params.name !== "Favicon.ico") {
        //const day = date.getDay(); 
        itemsModel.find({}, function(err, foundItems) {
            if(foundItems.length === 0 ) {
                itemsModel.insertMany(defaultItems, function(err) {
                    if(err) console.log(err);
                    else {
                        console.log("Default Saved To Database");
                        res.redirect("/");
                    }
                })
            }
            else {
                res.render("list", { pageTitle : "Today", listItems : foundItems });
            } 
        }) 
    }
});

app.post("/", function(req, res) {
    const {newItem, list} = req.body;
    const items = new itemsModel(
        {
            name : newItem
        }
    )
    if(list === "Today") {
        items.save();
        console.log("New Item Saved in Default Database " + items);
        res.redirect("/");
    } else {
        newItemsModel.findOne({name : list}, function(err, foundList) {
            if(!err) { 
                foundList.newItemList.push(items);
                foundList.save();
                res.redirect("/" + list);
            }
        })
    }
})

app.post("/delete", function(req, res) {
    console.log(req.body)
    const {checkboxid, pageTitle} = req.body;
    console.log(checkboxid + pageTitle)
    if(pageTitle === "Today") {
        itemsModel.findByIdAndDelete(checkboxid, function(err, docs) {
            if(err) {
                console.log(err); 
            } else {
                console.log("Deleted Item from Default: " + docs);
                res.redirect("/");
            }
        }) 
    } else {
        newItemsModel.findOneAndUpdate({name : pageTitle}, {$pull : {newItemList : {_id : checkboxid}}}, function(err, foundItem) {
            if(!err) {
                res.redirect("/" + pageTitle);
            }
        })
    }
})

app.get("/:url", function(req, res) {
    console.log(req.params);
    if(req.params.url === "favicon.ico") return;
    const customListUrl = _.capitalize(req.params.url);
    
    newItemsModel.findOne({name : customListUrl}, function(err, foundCustomItems) {
        if(!err) {
            if(!foundCustomItems) {
                const customListItem = new newItemsModel(
                    {
                        name : customListUrl,
                        newItemList : defaultItems
                    }  
                )
                customListItem.save();
                res.redirect("/" + customListUrl);
            } else {
                res.render("list", { pageTitle : foundCustomItems.name, listItems : foundCustomItems.newItemList });
            }
        }
    })
})

let port = process.env.PORT;
if(port == null || port == ""){
    port = 3000;
}

app.listen(port, function() {
    console.log("Server Started at " + port);
});