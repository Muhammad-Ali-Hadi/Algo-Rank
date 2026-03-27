const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfileData, updateProfileData, uploadAvatar } = require('../controllers/profileController');

router.use(authMiddleware);

router.get('/', getProfileData);
router.put('/', updateProfileData);
router.post('/avatar', uploadAvatar);

module.exports = router;
