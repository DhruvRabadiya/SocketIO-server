async function pagination(model, pipeline, pageNo, limitData) {
  const page = Number(pageNo) || 1;
  const limit = Number(limitData) || 12;
  const skip = (page - 1) * limit;
  const paginationStage = {
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      metadata: [{ $count: "total" }],
    },
  }; 
  const finalPipeline = [...pipeline, paginationStage];
  try {
    const result = await model.aggregate(finalPipeline);
    const data = result[0].data;
    const totalResults = result[0].metadata[0]?.total || 0;

    const totalPages = Math.ceil(totalResults / limit);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        limit,
      },
    };
  } catch (error) {
    throw error;
  }
}

module.exports = pagination;