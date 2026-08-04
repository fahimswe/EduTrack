const Note = require("../models/Note");

const getNotes = async (req, res) => {
  try {
    res.json(await Note.find({ user: req.user._id }).sort({ updatedAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: "A note title and content are required." });
    res.status(201).json(await Note.create({ title: title.trim(), content: content.trim(), user: req.user._id }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found." });
    const { title, content } = req.body;
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (!note.title || !note.content) return res.status(400).json({ message: "A note title and content are required." });
    res.json(await note.save());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found." });
    res.json({ message: "Note deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote };
