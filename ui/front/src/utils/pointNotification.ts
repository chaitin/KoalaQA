/**
 * 积分提示工具函数
 * 用于在用户操作后显示积分变化提示
 */

import alert from '@/components/alert'

export enum PointActionType {
  // 增加积分的操作
  CREATE_ARTICLE = 'CREATE_ARTICLE', // 发文章 +10
  ANSWER_ACCEPTED = 'ANSWER_ACCEPTED', // 回答被采纳 +10
  ARTICLE_LIKED = 'ARTICLE_LIKED', // 文章被点赞 +5
  ANSWER_LIKED = 'ANSWER_LIKED', // 回答被点赞 +5
  QUESTION_TO_ISSUE = 'QUESTION_TO_ISSUE', // 问题转issue +5
  ACCEPT_ANSWER = 'ACCEPT_ANSWER', // 采纳回答 +2
  ANSWER_QUESTION = 'ANSWER_QUESTION', // 回答问题 +1
  COMPLETE_PROFILE = 'COMPLETE_PROFILE', // 完善头像+个人介绍 +10

  // 减少积分的操作
  ANSWER_DISLIKED = 'ANSWER_DISLIKED', // 回答被点踩 -5
  DISLIKE_ANSWER = 'DISLIKE_ANSWER', // 点踩别人的回答 -2

  // 撤销操作（会减掉对应的积分）
  DELETE_ARTICLE = 'DELETE_ARTICLE', // 删除文章 -10
  DELETE_ANSWER = 'DELETE_ANSWER', // 删除回答 -1
  REVOKE_ACCEPT = 'REVOKE_ACCEPT', // 取消采纳 -10 (回答者) 或 -2 (提问者)
  REVOKE_LIKE = 'REVOKE_LIKE', // 取消点赞 -5 (被点赞者)
  REVOKE_DISLIKE = 'REVOKE_DISLIKE', // 取消点踩 +5 (被点踩者) 或 +2 (点踩者)
}

const POINT_MAP: Record<PointActionType, number> = {
  [PointActionType.CREATE_ARTICLE]: 10,
  [PointActionType.ANSWER_ACCEPTED]: 10,
  [PointActionType.ARTICLE_LIKED]: 5,
  [PointActionType.ANSWER_LIKED]: 5,
  [PointActionType.QUESTION_TO_ISSUE]: 5,
  [PointActionType.ACCEPT_ANSWER]: 2,
  [PointActionType.ANSWER_QUESTION]: 1,
  [PointActionType.COMPLETE_PROFILE]: 10,
  [PointActionType.ANSWER_DISLIKED]: -5,
  [PointActionType.DISLIKE_ANSWER]: -2,
  [PointActionType.DELETE_ARTICLE]: -10,
  [PointActionType.DELETE_ANSWER]: -1,
  [PointActionType.REVOKE_ACCEPT]: -10, // 默认是回答者被取消采纳
  [PointActionType.REVOKE_LIKE]: -5,
  [PointActionType.REVOKE_DISLIKE]: 5, // 取消点踩是恢复积分
}

/**
 * 显示积分变化提示
 * @param actionType 操作类型
 * @param customPoints 自定义积分值（可选，如果不提供则使用默认值）
 */
export function showPointNotification(actionType: PointActionType, customPoints?: number) {
  // const points = customPoints !== undefined ? customPoints : POINT_MAP[actionType]
  
  // if (points === 0) {
  //   return // 如果积分变化为0，不显示提示
  // }

  // const isPositive = points > 0
  // const pointsText = isPositive ? `+${points}` : `${points}`
  // const message = `积分${pointsText}`

  // // 使用 success 显示增加积分，使用 warning 显示减少积分
  // if (isPositive) {
  //   alert.success(message, 2000)
  // } else {
  //   alert.warning(message, 2000)
  // }
}

/**
 * 显示自定义积分提示
 * @param points 积分变化值（正数表示增加，负数表示减少）
 */
export function showCustomPointNotification(points: number) {
  // if (points === 0) {
  //   return
  // }

  // const isPositive = points > 0
  // const pointsText = isPositive ? `+${points}` : `${points}`
  // const message = `积分${pointsText}`

  // if (isPositive) {
  //   alert.success(message, 2000)
  // } else {
  //   alert.warning(message, 2000)
  // }
}

