const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;


app.use(express.json());

let todos = [];

// Builds a list with "Unique ID" based on time added
app.post('/', (req, res) => {
    const newTodo = {
        id: Date.now().toString(),
        ...req.query
    };

    todos.push(newTodo);

    const filePath = path.join(__dirname, 'data', 'todoList.txt');

    const todoData = `${newTodo.id}\n`;
    fs.appendFile(filePath, todoData, err => {
        if (err) {
            console.error('Error appending to file:', err);
            return res.status(500).json({ error: 'Failed to save todo' });
        }
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


// Deletes the ID with its row from file "todoList.txt" else deletes all todos if no ID was provided
app.delete('/:id?', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(__dirname, 'data', 'todoList.txt');

    if (!id) {
        // Clear all todos
        todos = [];
        fs.writeFile(filePath, '', err => {
            if (err) {
                console.error('Error clearing file:', err);
                return res.status(500).json({ error: 'Failed to clear todo data' });
            }
            res.sendStatus(204); // No content response
        });
    } else {
        // Delete specific todo by ID
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
    }
});


// Updating fields of a todo using unique ID and query parameters
app.patch('/:id', (req, res) => {
    const id = req.params.id;
    const todo = todos.find(todo => todo.id === id);
    if (!todo) {
        return res.status(404).json({ error: 'Todo not found' });
    }

    // Check if query parameters are provided
    if (Object.keys(req.query).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    // Update the todo with the fields provided in the query parameters
    Object.assign(todo, req.query);

    // Update the file with the new data
    const filePath = path.join(__dirname, 'data', 'todoList.txt');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Failed to update todo data' });
        }

        // Update the line with the new data
        const lines = data.split('\n').map(line => {
            if (line.trim() === '') return '';
            const [todoId] = line.split(',');
            if (todoId === id) {
                return `${todoId}`;
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



//#region  Check that for "express routing authentication"
const authMiddleware = (req, res, next) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin') {
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({ message: 'This is a protected route' });
});
//#endregion

app.listen(port);