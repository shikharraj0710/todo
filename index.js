require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const _ = require('lodash')
const awsServerlessExpress = require('aws-serverless-express')

// Initialize the Express app
const app = express()
mongoose.connect(process.env.DATABASE_URL)

// Set view engine and middleware
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// Define MongoDB schemas and models
const itemsSchema = new mongoose.Schema({
  name: String
})

const itemsModel = mongoose.model('Todo', itemsSchema)

const item1 = new itemsModel({
  name: 'Drink Water'
})
const item2 = new itemsModel({
  name: 'Eat Ice Cream'
})
const item3 = new itemsModel({
  name: 'Chocolate Day'
})

const newItemsSchema = new mongoose.Schema({
  name: String,
  newItemList: [itemsSchema]
})

const newItemsModel = mongoose.model('Newlist', newItemsSchema)

const defaultItems = [item1, item2, item3]

app.get('/', function (req, res) {
  if (req.params.name !== 'Favicon.ico') {
    itemsModel.find({}, function (err, foundItems) {
      if (foundItems.length === 0) {
        itemsModel.insertMany(defaultItems, function (err) {
          if (err) console.log(err)
          else {
            res.redirect('/')
          }
        })
      } else {
        res.render('list', { pageTitle: 'Today', listItems: foundItems })
      }
    })
  }
})

app.post('/', async function (req, res) {
  const { newItem, list } = req.body
  const items = new itemsModel({
    name: newItem
  })
  if (list === 'Today') {
    await items.save()
    res.redirect('/')
  } else {
    newItemsModel.findOne({ name: list }, function (err, foundList) {
      if (!err) {
        foundList.newItemList.push(items)
        foundList.save()
      }
      res.redirect('/' + list)
    })
  }
})

app.post('/delete', function (req, res) {
  const { checkboxid, pageTitle } = req.body
  if (pageTitle === 'Today') {
    itemsModel.findByIdAndDelete(checkboxid, function (err, docs) {
      if (err) {
        console.log(err)
      } else {
        res.redirect('/')
      }
    })
  } else {
    newItemsModel.findOneAndUpdate(
      { name: pageTitle },
      { $pull: { newItemList: { _id: checkboxid } } },
      function (err, foundItem) {
        if (!err) {
          res.redirect('/' + pageTitle)
        }
      }
    )
  }
})

app.get('/:url', async function (req, res) {
  if (req.params.url === 'favicon.ico') return
  const customListUrl = _.capitalize(req.params.url)

  newItemsModel.findOne(
    { name: customListUrl },
    async function (err, foundCustomItems) {
      if (!err) {
        if (!foundCustomItems) {
          const customListItem = new newItemsModel({
            name: customListUrl,
            newItemList: defaultItems
          })
          await customListItem.save()
          res.redirect('/' + customListUrl)
        } else {
          res.render('list', {
            pageTitle: foundCustomItems.name,
            listItems: foundCustomItems.newItemList
          })
        }
      }
    }
  )
})

// Setup AWS Lambda handler using aws-serverless-express
const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context)
}

let port = process.env.PORT
if (port == null || port == '') {
  port = 3000
}

app.listen(port, function () {
  console.log('Server Started at ' + port)
})
