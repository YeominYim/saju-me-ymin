export default function PersonForm({ title, person, onChange, nameRef }) {
  function patch(partial) {
    onChange({ ...person, ...partial })
  }

  function handleTimeChange(value) {
    patch({ birthTime: value, timeUnknown: value ? false : person.timeUnknown })
  }

  function handleTimeUnknown() {
    const next = !person.timeUnknown
    patch({
      timeUnknown: next,
      birthTime: next ? '' : person.birthTime,
    })
  }

  return (
    <div className="person-block">
      {title && <h3 className="person-title">{title}</h3>}
      <div className="form-grid">
        <div className="form-row form-row-identity">
          <label className="field field-name">
            <span>이름</span>
            <input
              ref={nameRef}
              type="text"
              value={person.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="이름을 입력하세요"
            />
          </label>

          <label className="field field-gender">
            <span>성별</span>
            <select
              value={person.gender}
              onChange={(e) => patch({ gender: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="male">남자</option>
              <option value="female">여자</option>
            </select>
          </label>
        </div>

        <div className="form-row form-row-birth">
          <label className="field">
            <span>양력 / 음력</span>
            <select
              value={person.calendarType}
              onChange={(e) => patch({ calendarType: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </label>

          <label className="field field-date">
            <span>생년월일</span>
            <div className="control">
              <input
                type="date"
                value={person.birthDate}
                onChange={(e) => patch({ birthDate: e.target.value })}
              />
            </div>
          </label>

          <div className="field field-time">
            <span>태어난 시간</span>
            <div className="time-group">
              <div className={`control ${person.timeUnknown ? 'is-disabled' : ''}`}>
                <input
                  type="time"
                  value={person.birthTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={person.timeUnknown}
                  aria-label={`${title || '본인'} 태어난 시간`}
                />
              </div>
              <button
                type="button"
                className={`time-unknown-btn ${person.timeUnknown ? 'is-active' : ''}`}
                onClick={handleTimeUnknown}
                aria-pressed={person.timeUnknown}
              >
                시간 모름
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
