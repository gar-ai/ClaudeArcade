/// Estimate token count for a string.
/// Uses the chars/4 heuristic which is ~90% accurate for English text.
#[allow(unused)]
pub fn estimate_tokens(content: &str) -> u32 {
    (content.chars().count() as f64 / 4.0).ceil() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_tokens() {
        // 13 chars = ceil(13/4) = 4 tokens
        assert_eq!(estimate_tokens("Hello, world!"), 4);

        // Empty string = 0 tokens
        assert_eq!(estimate_tokens(""), 0);

        // Single char = 1 token
        assert_eq!(estimate_tokens("a"), 1);
    }
}
