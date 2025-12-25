import {Router} from 'express';
import {testDb} from '../db/pool';

const router = Router();

router.get('/', async(req, res) => {
    try{
        const dbok = await testDb();
        if(!dbok){
            return res.status(503).json({
                status: 'not ready',
                reason: 'database check failed'
            });
        }

        return res.status(200).json({
            status: 'ready'
        });
    }catch(err){
        return res.status(503).json({
            status: 'not ready',
            reason: 'exception',
            error: err instanceof Error ? err.message : 'unknown'
        });
    }
});

export default router;
