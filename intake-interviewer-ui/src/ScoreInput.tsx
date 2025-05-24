import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';

const SCORE_LABELS = [
  '0 – Never or almost never have the symptom',
  '1 – Occasionally, not severe',
  '2 – Occasionally, severe',
  '3 – Frequently, not severe',
  '4 – Frequently, severe',
];

interface AnswerOption {
  code: string | number;
  display: string;
}

interface ScoreInputProps {
  disabled?: boolean;
  onSelect: (score: number | string) => void;
  labels?: string[];
  answerOptions?: AnswerOption[];
  renderSkipButton?: React.ReactNode;
}

const ScoreInput: React.FC<ScoreInputProps> = ({ disabled, onSelect, labels, answerOptions, renderSkipButton }) => {
  if (answerOptions && answerOptions.length > 0) {
    return (
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', my: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {answerOptions.map((opt, idx) => (
          <Tooltip key={idx} title={opt.display} arrow>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => onSelect(opt.code)}
              disabled={disabled}
              aria-label={opt.display}
              tabIndex={0}
            >
              {opt.display}
            </Button>
          </Tooltip>
        ))}
        {renderSkipButton && (
          <Box sx={{ ml: 2 }}>{renderSkipButton}</Box>
        )}
      </Box>
    );
  }
  const scoreLabels = labels || SCORE_LABELS;
  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', my: 2 }}>
      {scoreLabels.map((label, score) => (
        <Tooltip key={score} title={label} arrow>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => onSelect(score)}
            disabled={disabled}
            aria-label={label}
            tabIndex={0}
          >
            {score}
          </Button>
        </Tooltip>
      ))}
    </Box>
  );
};

export default ScoreInput; 