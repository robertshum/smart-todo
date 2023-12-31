/*
 * All routes for User Data are defined here
 * Since this file is loaded in server.js into api/todos,
 *   these routes are mounted onto /api/todos
 * See: https://expressjs.com/en/guide/using-middleware.html#middleware.router
 */

const express = require('express');
const router = express.Router();
const todoQueries = require('../db/queries/todos');
const googleApi = require('../apis/google-natural-lang-api');
const helpers = require('../apis/helpers');
router.use((req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first. using /users/<id>' });
    return;
  }
  next();
});

router.get('/', (req, res) => {
  const userCookie = req.session.user;
  todoQueries.getTodosById(userCookie.id)
    .then(todos => res.json(todos))
    .catch(err => {
      res
        .status(401)
        .json({ error: err.message });
    });
});

router.get('/withCategories', (req, res) => {
  const userId = req.session.user.id;
  todoQueries.getTodosByIdWithCategoryNames(userId)
    .then(todos => res.json(todos))
    .catch(err => {
      res
        .status(401)
        .json({ error: err.message });
    });
});

router.post('/', (req, res) => {
  const text = req.body.text;
  const userCookie = req.session.user;
  googleApi.callClassifyText(text)
    .then(googleCategories => {
      //the category in sql.
      //return 'To Eat', for example.
      console.log(googleCategories);
      return helpers.organizeCategories(googleCategories);
    })
    .then(category => {
      //make the SQL call here:
      return todoQueries.createNewTodo(userCookie.id, category, text);
    })
    .then(newTodo => {
      //return the new record from sql.
      res.json(newTodo);
    })
    .catch(err => {
      res
        .status(401)
        .json({ error: err.message });
    });
});

router.post('/update', (req, res) => {

  if (req.body.isCompleted) {
    return markTodoAsComplete(req, res);

  }

  if (req.body.category) {
    return updateTodoCategory(req, res);
  }

  //invalid request
  return req.status(400).json({ error: "Invalid Request." });;
});

router.patch('/:id', (req, res) => {
  todoQueries.updateCategoryWithId()
    .then(updatedTodo => res.json(updatedTodo))
    .catch(err => {
      res
        .status(300)
        .json({ error: err.message });
    });
});

//helper - call to mark it as complete
const markTodoAsComplete = function(req, res) {
  todoQueries.markTodoAsComplete(req.body.id)
    .then(updatedRow => {
      res.json(updatedRow);
    })
    .catch(err => {
      res
        .status(500)
        .json({ error: err.message });
    });
};

//helper - call to update the category
const updateTodoCategory = function(req, res) {
  todoQueries.updateCategoryWithId(req.body.id, req.body.category)
    .then(updatedRow => {
      res.json(updatedRow);
    })
    .catch(err => {
      res
        .status(500)
        .json({ error: err.message });
    });
};

module.exports = router;
