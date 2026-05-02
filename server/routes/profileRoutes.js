const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfileData, updateProfileData, uploadAvatar, removeAvatar, getContestHistory } = require('../controllers/profileController');

router.use(authMiddleware);

router.get('/', getProfileData);
router.get('/contest-history', getContestHistory);
router.put('/', updateProfileData);
router.post('/avatar', uploadAvatar);
router.delete('/avatar', removeAvatar);

module.exports = router;
