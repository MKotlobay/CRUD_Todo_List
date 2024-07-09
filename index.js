const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

let todos = [];

// Builds a list with "Unique ID" based on time added and also as default adds his status of completions as "False"
app.post('/', (req, res) => {
    const newTodo = {
        id: Date.now().toString(),
        completed: false
    };

    todos.push(newTodo);

    const filePath = path.join(__dirname, 'data', 'todoList.txt');

    const todoData = `${newTodo.id},${newTodo.completed}\n`;
    fs.appendFile(filePath, todoData, err => { // Appending exsisting file
        res.status(201).json(newTodo);
    });
});

// Shows all lists
app.get('/', (req, res) => {
    res.json(todos);
});

// Shows only by ID full details about
app.get('/:id', (req, res) => {
    const id = req.params.id;
    const todo = todos.find(todo => todo.id === id);
    res.json(todo)
});


// Deletes the ID with his row from file "todoList.txt"
app.delete('/:id', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(__dirname, 'data', 'todoList.txt');

    todos = todos.filter(todo => todo.id !== id);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Failed to update todo data' });
        }

        const updatedData = data.split('\n')
            .filter(line => {
                const [todoId] = line.split(',');
                return todoId !== id;
            })
            .join('\n');

        fs.writeFile(filePath, updatedData, err => {
            if (err) {
                console.error('Error updating file:', err);
                return res.status(500).json({ error: 'Failed to update todo data' });
            }
            res.sendStatus(204); // No content response
        });
    });
});


// Updating status of "Completed from false to true" using unique ID
app.patch('/:id', (req, res) => {
    const id = req.params.id;
    const todo = todos.find(todo => todo.id === id);
    if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
    }

    // Update the completed status of the todo to true
    todo.completed = true;

    // Update the file with the new completed status
    const filePath = path.join(__dirname, 'data', 'todoList.txt');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Failed to update todo data' });
        }

        // Update the line with the new completed status
        const lines = data.split('\n').map(line => {
            if (line.trim() === '') return '';
            const [todoId, title, completed] = line.split(',');
            if (todoId === id) {
                return `${todoId},${title},true`;
            }
            return line;
        });

        // Write the updated lines back to the file
        fs.writeFile(filePath, lines.join('\n'), err => {
            if (err) {
                console.error('Error updating file:', err);
                res.status(500).json({ error: 'Failed to update todo data' });
            } else {
                res.json(todo); // Respond with the updated todo item
            }
        });
    });
});


app.listen(port);