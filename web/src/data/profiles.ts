export type ProfileId = 'core' | 'elite' | 'recovery' | 'combined';
export const LAB_VERSION = 'dnf-lab-0.1';
export const PROFILES: Record<ProfileId, {
  name: string; description: string; elite: boolean; recovery: boolean;
}> = {
  core: {name: '원본 코어', description: '승인된 규칙 그대로. 개선 효과를 비교하는 기준입니다.', elite: false, recovery: false},
  elite: {name: '정예 던전 실험', description: '정예 몬스터 비중 증가. 파워 400 이상 사냥 성공 시 추가 드로우 1장.', elite: true, recovery: false},
  recovery: {name: '재건 지원 실험', description: '게임당 1회, 동료·가용 경험치가 모두 없을 때 견습 모험가를 찾아 레스트 소환.', elite: false, recovery: true},
  combined: {name: '정예 + 재건 실험', description: '정예 던전과 재건 지원을 함께 적용합니다.', elite: true, recovery: true},
};
export const ELITE_COUNTS = [6,6,6,8,8,6,4,2,2,1,1];
