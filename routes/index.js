const fs = require('fs');
const path = require('path');

const express = require('express');
const moment = require('moment');
const _  = require('lodash');

const memoryCache = require('../services/memory-cache');
const Tasks = require('../models/task');

const router = express.Router();
const readmeContent = fs.readFileSync(path.join(process.cwd(), '/README.md'));

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', {
        title: 'LPT Request Scheduler',
        content: readmeContent
    });
});

router.use('/cron', (req, res, next) => {

    // set unassigned env variables
    if (!process.env.SCHEDULER_MAX) process.env.SCHEDULER_MAX = 5;
    if (!process.env.SCHEDULER_MAX_UNIT) process.env.SCHEDULER_MAX_UNIT = 'minute';

    const taskParams = {
        where: {
            state: 'uninitialized',
            startTimestamp: {
                $lte: moment().add(process.env.SCHEDULER_MAX, process.env.SCHEDULER_MAX_UNIT).toDate()
            }
        }
    };

    Tasks.findAll(taskParams)
        .then((tasks) => {
            // task.init() is  a member function we defined in the task model
            // it returns a an object containing everything you could ever want to know about a timeout
            const taskMetas =  _.map(tasks, (task) => {
                return task.start()
            });

            taskMetas.forEach(taskMeta => {
                memoryCache.set(taskMeta.model.dataValues.taskId, taskMeta);
            });

            res.json({
                count: taskMetas.length,
                tasks: taskMetas.map(taskMeta => taskMeta.model.dataValues)
            })
        })
        .catch((err) => {
            console.error(err);
            return Promise.reject(err);
        });

});

module.exports = router;