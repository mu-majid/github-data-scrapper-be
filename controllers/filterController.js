import Filter from '../models/Filter.js';

export const getUserFilters = async (req, res, next) => {
  try {
    const filters = await Filter.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(filters);
  } catch (error) {
    next(error);
  }
};

export const getFilter = async (req, res, next) => {
  try {
    const filter = await Filter.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }
    
    res.json(filter);
  } catch (error) {
    next(error);
  }
};

export const createFilter = async (req, res, next) => {
  try {

    const filter = new Filter({
      ...req.body,
      userId: req.user._id
    });

    await filter.save();
    res.status(201).json(filter);
  } catch (error) {
    next(error);
  }
};

export const updateFilter = async (req, res, next) => {
  try {
    const filter = await Filter.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    res.json(filter);
  } catch (error) {
    next(error);
  }
};

export const deleteFilter = async (req, res, next) => {
  try {
    const filter = await Filter.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    res.json({ message: 'Filter deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const toggleFilter = async (req, res, next) => {
  try {
    const filter = await Filter.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    // If activating this filter, deactivate all others for the same collection
    if (!filter.isActive) {
      await Filter.updateMany(
        { userId: req.user._id, collection: filter.collection },
        { isActive: false }
      );
    }

    filter.isActive = !filter.isActive;
    await filter.save();

    res.json(filter);
  } catch (error) {
    next(error);
  }
};

export const getActiveFiltersForCollection = async (req, res, next) => {
  try {
    const filters = await Filter.find({
      userId: req.user._id,
      collection: req.params.collection,
      isActive: true
    });

    res.json(filters);
  } catch (error) {
    next(error);
  }
};