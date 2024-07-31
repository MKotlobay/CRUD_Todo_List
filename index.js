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

    // Format the data to be saved in the file, excluding the duplicated id key
    const todoData = `id:${newTodo.id},${Object.entries(newTodo).filter(([key]) => key !== 'id').map(([key, value]) => `${key}:${value}`).join(',')}\n`;

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
    const archivePath = path.join(__dirname, 'data', 'archive.txt');

    if (!id) {
        // Clear all todos
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return res.status(500).json({ error: 'Failed to read todo data' });
            }

            // Write all data to archive.txt
            fs.appendFile(archivePath, data, err => {
                if (err) {
                    console.error('Error appending to archive file:', err);
                    return res.status(500).json({ error: 'Failed to archive todo data' });
                }

                // Clear the todo list
                todos = [];
                fs.writeFile(filePath, '', err => {
                    if (err) {
                        console.error('Error clearing file:', err);
                        return res.status(500).json({ error: 'Failed to clear todo data' });
                    }
                    res.sendStatus(204); // No content response
                });
            });
        });
    } else {
        // Delete specific todo by ID
        const todoToArchive = todos.find(todo => todo.id === id);
        todos = todos.filter(todo => todo.id !== id);

        // Format the todo to be archived
        const archiveData = `id:${todoToArchive.id},${Object.entries(todoToArchive).filter(([key]) => key !== 'id').map(([key, value]) => `${key}:${value}`).join(',')}\n`;

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return res.status(500).json({ error: 'Failed to update todo data' });
            }

            const updatedData = data.split('\n')
                .filter(line => {
                    const [todoId] = line.split(',');
                    return todoId !== `id:${id}`;
                })
                .join('\n');

            fs.writeFile(filePath, updatedData, err => {
                if (err) {
                    console.error('Error updating file:', err);
                    return res.status(500).json({ error: 'Failed to update todo data' });
                }

                // Append the archived todo to archive.txt
                fs.appendFile(archivePath, archiveData, err => {
                    if (err) {
                        console.error('Error appending to archive file:', err);
                        return res.status(500).json({ error: 'Failed to archive todo data' });
                    }
                    res.sendStatus(204); // No content response
                });
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

        // Update the line with the new data, excluding the duplicated id key
        const lines = data.split('\n').map(line => {
            if (line.trim() === '') return '';
            const [todoId] = line.split(',');
            if (todoId === `id:${id}`) {
                return `id:${todo.id},${Object.entries(todo).filter(([key]) => key !== 'id').map(([key, value]) => `${key}:${value}`).join(',')}`;
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



//#region Check that for "express routing authentication"
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