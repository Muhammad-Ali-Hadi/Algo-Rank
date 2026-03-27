const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfileData, updateProfileData, uploadAvatar, removeAvatar } = require('../controllers/profileController');

router.use(authMiddleware);

router.get('/', getProfileData);
router.put('/', updateProfileData);
router.post('/avatar', uploadAvatar);
router.delete('/avatar', removeAvatar);

module.exports = router;
