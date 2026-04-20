const News = require('../models/News');
const NewsComment = require('../models/NewsComment');
const User = require('../models/User');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { moderateNewsComment } = require('../services/newsModerationService');

const isPathInside = (filePath, baseDir) => {
  if (!filePath || !baseDir) return false;
  const base = path.resolve(baseDir) + path.sep;
  const target = path.resolve(filePath);
  return target.startsWith(base);
};

const newsAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/news';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `news_${Date.now()}_${sanitized}`);
  }
});

const newsUpload = multer({
  storage: newsAttachmentStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

const canUserSeeNews = (user, news) => {
  if (news.author?.toString() === user._id.toString()) {
    return true;
  }

  const userDept = user.department?.toString();
  const newsDept = news.targetDepartment?.toString();
  const userClass = user.class?.toString();
  const newsClass = news.targetClass?.toString();
  const userId = user._id.toString();
  const targetUserId = news.targetUser?.toString();

  switch (news.targetType) {
    case 'ALL_USERS':
    case 'ALL_DEPARTMENTS':
      return true;
    case 'ALL_HOD':
      return user.role === 'HOD';
    case 'SPECIFIC_HOD':
      return user.role === 'HOD' && userId === targetUserId;
    case 'SPECIFIC_DEPARTMENT':
      return userDept === newsDept;
    case 'ALL_TEACHERS':
      return ['TEACHER', 'PROFESSOR'].includes(user.role);
    case 'ALL_STUDENTS':
      return user.role === 'STUDENT';
    case 'DEPT_ALL':
      return userDept === newsDept;
    case 'DEPT_TEACHERS':
      return ['TEACHER', 'PROFESSOR'].includes(user.role) && userDept === newsDept;
    case 'DEPT_STUDENTS':
      return user.role === 'STUDENT' && userDept === newsDept;
    case 'SPECIFIC_DEPT_HOD':
      return userId === targetUserId;
    case 'CLASS_STUDENTS':
      return user.role === 'STUDENT' && userClass === newsClass;
    default:
      return false;
  }
};

const validateTargetPermission = (authorRole, targetType, author) => {
  if (authorRole === 'ADMIN') {
    return { allowed: true };
  }
  
  if (authorRole === 'HOD') {
    const allowed = ['DEPT_ALL', 'DEPT_TEACHERS', 'DEPT_STUDENTS', 'SPECIFIC_DEPT_HOD'].includes(targetType);
    return { allowed, error: allowed ? null : 'HOD can only target own department' };
  }
  
  if (authorRole === 'PROFESSOR') {
    const allowed = targetType === 'CLASS_STUDENTS';
    return { allowed, error: allowed ? null : 'Professor can only target own class students' };
  }
  
  return { allowed: false, error: 'Not authorized to create news' };
};

exports.createNews = [
  newsUpload.array('attachments', 5),
  async (req, res, next) => {
    try {
      const { title, content, targetType, targetDepartment, commentsEnabled = true } = req.body;

      const newsData = {
        title,
        content,
        author: req.user._id,
        authorRole: req.user.role,
        targetType,
        commentsEnabled
      };

      if (req.user.role === 'HOD' || req.user.role === 'TEACHER') {
        newsData.targetDepartment = req.user.department;
      } else if (req.user.role === 'ADMIN' && targetDepartment) {
        newsData.targetDepartment = targetDepartment;
      }

      if (Array.isArray(req.files) && req.files.length > 0) {
        newsData.attachments = req.files.map((f) => ({
          fileName: f.originalname,
          filePath: f.path,
          fileSize: f.size
        }));
      }

      const news = await News.create(newsData);
      const populated = await News.findById(news._id).populate('author', 'name role');
      res.status(201).json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }
];

exports.getAllNews = async (req, res, next) => {
  try {
    const allNews = await News.find()
      .populate('author', 'name role')
      .sort({ createdAt: -1 });

    if (req.user.role === 'ADMIN') {
      return res.json({ success: true, data: allNews });
    }

    const visibleNews = allNews.filter((item) => canUserSeeNews(req.user, item));
    res.json({ success: true, data: visibleNews });
  } catch (error) {
    next(error);
  }
};

exports.getNewsById = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'name role');

    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    if (!canUserSeeNews(req.user, news)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const comments = await NewsComment.find({ news: news._id })
      .populate('author', 'name role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: { ...news.toObject(), comments } });
  } catch (error) {
    next(error);
  }
};

exports.updateNews = [
  newsUpload.array('attachments', 5),
  async (req, res, next) => {
    try {
      const news = await News.findById(req.params.id);
      if (!news) return res.status(404).json({ success: false, message: 'News not found' });

      const isAuthor = news.author.toString() === req.user._id.toString();
      if (!isAuthor && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const { title, content, targetType, commentsEnabled, clearAttachments } = req.body;
      if (title) news.title = title;
      if (content) news.content = content;
      if (targetType) news.targetType = targetType;
      if (commentsEnabled !== undefined) news.commentsEnabled = String(commentsEnabled) === 'true' || commentsEnabled === true;

      if (req.user.role === 'ADMIN' && req.body.targetDepartment) {
        news.targetDepartment = req.body.targetDepartment;
      }

      const shouldClear = String(clearAttachments) === 'true';
      const hasNewFiles = Array.isArray(req.files) && req.files.length > 0;
      if (shouldClear || hasNewFiles) {
        (news.attachments || []).forEach((a) => {
          if (a?.filePath && fs.existsSync(a.filePath)) fs.unlinkSync(a.filePath);
        });
        news.attachments = [];
      }

      if (hasNewFiles) {
        news.attachments = req.files.map((f) => ({
          fileName: f.originalname,
          filePath: f.path,
          fileSize: f.size
        }));
      }

      await news.save();
      const populated = await News.findById(news._id).populate('author', 'name role');
      res.json({ success: true, data: populated });
    } catch (error) {
      next(error);
    }
  }
];

exports.deleteNews = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    const canDelete = req.user.role === 'ADMIN' || 
                      news.author.toString() === req.user._id.toString() ||
                      (req.user.role === 'HOD' && news.targetDepartment?.toString() === req.user.department?.toString());

    if (!canDelete) return res.status(403).json({ success: false, message: 'Not authorized' });

    (news.attachments || []).forEach((a) => {
      if (a?.filePath && fs.existsSync(a.filePath)) fs.unlinkSync(a.filePath);
    });

    await news.deleteOne();
    await NewsComment.deleteMany({ news: req.params.id });

    res.json({ success: true, message: 'News deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getNewsAttachment = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    if (!canUserSeeNews(req.user, news)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'Invalid attachment index' });
    }

    const att = (news.attachments || [])[index];
    if (!att?.filePath) return res.status(404).json({ success: false, message: 'Attachment not found' });
    if (!isPathInside(att.filePath, 'uploads/news')) {
      return res.status(400).json({ success: false, message: 'Invalid attachment path' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${att.fileName || 'attachment.pdf'}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.resolve(att.filePath));
  } catch (error) {
    next(error);
  }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    const index = news.likes.indexOf(req.user._id);
    if (index > -1) {
      news.likes.splice(index, 1);
    } else {
      news.likes.push(req.user._id);
    }

    await news.save();
    res.json({ success: true, data: { liked: index === -1, count: news.likes.length } });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    if (!news.commentsEnabled || news.commentsLocked) {
      return res.status(403).json({ success: false, message: 'Comments not allowed' });
    }

    const content = String(req.body?.content ?? '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    if (content.length > 500) return res.status(400).json({ success: false, message: 'Comment is too long (max 500 chars)' });

    const moderation = moderateNewsComment(content);
    if (!moderation.allowed) {
      return res.status(400).json({
        success: false,
        message: 'Comment blocked by moderation. Please keep it respectful.'
      });
    }

    const comment = await NewsComment.create({
      news: req.params.id,
      author: req.user._id,
      content
    });

    const populated = await NewsComment.findById(comment._id).populate('author', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await NewsComment.findById(req.params.commentId).populate('news');
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const canDelete = req.user.role === 'ADMIN' ||
                      comment.author.toString() === req.user._id.toString() ||
                      (req.user.role === 'HOD' && comment.news.targetDepartment?.toString() === req.user.department?.toString());

    if (!canDelete) return res.status(403).json({ success: false, message: 'Not authorized' });

    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

exports.lockComments = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ success: false, message: 'News not found' });

    const canLock = req.user.role === 'ADMIN' || news.author.toString() === req.user._id.toString();
    if (!canLock) return res.status(403).json({ success: false, message: 'Not authorized' });

    news.commentsLocked = !news.commentsLocked;
    await news.save();

    res.json({ success: true, data: { commentsLocked: news.commentsLocked } });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
